import { screen, waitFor, fireEvent } from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES_PATH } from "../constants/routes.js"
import mockStore from "../__mocks__/store"
import router from "../app/Router.js"

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      document.body.innerHTML = BillsUI({ data: bills })

      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')
      expect(windowIcon.classList.contains('active-icon')).toBe(true)
    })

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen.getAllByText(/^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i).map(a => a.innerHTML)
      const antiChrono = (a, b) => ((a < b) ? 1 : -1)
      const datesSorted = [...dates].sort(antiChrono)
      expect(dates).toEqual(datesSorted)
    })

    test("Then clicking on the eye icon should open the modal with the correct image", async () => {
      document.body.innerHTML = BillsUI({ data: bills })

      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES_PATH[pathname]
      }

      const store = null
      const billsInstance = new Bills({ document, onNavigate, store, localStorage: window.localStorage })
      $.fn.modal = jest.fn() // Mock jQuery modal function
      const eyeIcon = screen.getAllByTestId("icon-eye")[0]
      const handleClickIconEye = jest.fn(() => billsInstance.handleClickIconEye(eyeIcon))
      eyeIcon.addEventListener("click", handleClickIconEye)
      fireEvent.click(eyeIcon)
      expect(handleClickIconEye).toHaveBeenCalled()
      expect($.fn.modal).toHaveBeenCalled()
    })

    test("Then it should fetch bills from the mock API", async () => {
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByText("Mes notes de frais"))
      const contentPending = await screen.getByText("En attente")
      expect(contentPending).toBeTruthy()
      expect(screen.getByTestId("icon-window")).toBeTruthy()
    })

    test("Then it should handle API error", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.reject(new Error("Erreur 404"))
          }
        }
      })
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await new Promise(process.nextTick)
      const message = await screen.getByText(/Erreur 404/)
      expect(message).toBeTruthy()
    })

    test("Then it should handle API error for empty bills", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          list: () => {
            return Promise.resolve([])
          }
        }
      })
      localStorage.setItem("user", JSON.stringify({ type: "Employee", email: "a@a" }))
      const root = document.createElement("div")
      root.setAttribute("id", "root")
      document.body.append(root)
      router()
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByText("Mes notes de frais"))
      const billsMessage = screen.queryByText("Vous n'avez pas de notes de frais")
      expect(billsMessage).toBeTruthy()
    })
  })
})
