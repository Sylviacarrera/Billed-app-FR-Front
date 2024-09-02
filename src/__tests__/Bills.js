import { screen, waitFor, fireEvent } from "@testing-library/dom"
import BillsUI from "../views/BillsUI.js"
import Bills from "../containers/Bills.js"
import { bills } from "../fixtures/bills.js"
import { ROUTES, ROUTES_PATH } from "../constants/routes.js"
import mockStore from "../__mocks__/store"
import router from "../app/Router.js"
import { localStorageMock } from "../__mocks__/localStorage.js"

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {

  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock })
    window.localStorage.setItem('user', JSON.stringify({
      type: 'Employee'
    }))
    const root = document.createElement("div")
    root.setAttribute("id", "root")
    document.body.append(root)
    router()
  })

  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      window.onNavigate(ROUTES_PATH.Bills)
      const windowIcon = await waitFor(() => screen.getByTestId('icon-window'))
      expect(windowIcon.getAttribute('class')).toEqual('active-icon')
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
      window.onNavigate(ROUTES_PATH.Bills)
      const iconEyes = await waitFor(() => screen.getAllByTestId('icon-eye'))

      expect(iconEyes.length).toEqual((await mockStore.bills().list()).length)
    })

    describe("When I click on 'new bill button'", () => {
      test("Then i should be sent on New Bill page", async () => {
        document.body.innerHTML = BillsUI({ data: bills })

        const onNavigate = (pathname) => {
          document.body.innerHTML = ROUTES({ pathname })
        }
        const store = null
        const bill = new Bills({
          document, onNavigate, store, bills, localStorage: window.localStorage
        })

        const buttonNewBill = screen.getByTestId('btn-new-bill')
        const handleClickNewBill = jest.fn(e => bill.handleClickNewBill(e))
        buttonNewBill.addEventListener('click', handleClickNewBill)
        fireEvent.click(buttonNewBill)
        expect(handleClickNewBill).toHaveBeenCalled()
        const formNewBill = await waitFor(() => screen.getByTestId('form-new-bill'))
        expect(formNewBill).toBeTruthy()
      })
    })

    describe("When an error occurs on API", () => {
      beforeEach(() => {
        jest.spyOn(mockStore, "bills")
        Object.defineProperty(
          window,
          'localStorage',
          { value: localStorageMock }
        )
        window.localStorage.setItem('user', JSON.stringify({
          type: 'Employee'
        }))
        const root = document.createElement("div")
        root.setAttribute("id", "root")
        document.body.appendChild(root)
        router()
      })
      afterEach(() => document.body.innerHTML = "")
      test("fetches bills from an API and fails with 404 message error", async () => {

        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 404"))
            }
          }
        })
        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 404/)
        expect(message).toBeTruthy()
      })
      test("fetches bills from an API and fails with 500 message error", async () => {

        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error("Erreur 500"))
            }
          }
        })

        window.onNavigate(ROUTES_PATH.Bills)
        await new Promise(process.nextTick);
        const message = await screen.getByText(/Erreur 500/)
        expect(message).toBeTruthy()
      })
    })

  })
})
