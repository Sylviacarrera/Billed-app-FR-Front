import { screen, fireEvent, waitFor } from "@testing-library/dom"
import NewBillUI from "../views/NewBillUI.js"
import NewBill from "../containers/NewBill.js"
import { localStorageMock } from "../__mocks__/localStorage.js"
import mockStore from "../__mocks__/store"

jest.mock("../app/store", () => mockStore)

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    beforeEach(() => {
      document.body.innerHTML = NewBillUI()
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem('user', JSON.stringify({ type: 'Employee', email: "employee@test.com" }))
    });

    test("Then it should only accept files with jpg, jpeg, or png extension", () => {
      const onNavigate = jest.fn()
      const store = mockStore
      const newBill = new NewBill({ document, onNavigate, store, localStorage: window.localStorage })

      const fileInput = screen.getByTestId('file')
      const file = new File(['dummy content'], 'sample.pdf', { type: 'application/pdf' })

      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      fileInput.addEventListener('change', handleChangeFile)
      fireEvent.change(fileInput, { target: { files: [file] } })

      expect(handleChangeFile).toHaveBeenCalled()
      expect(fileInput.value).toBe("") // file input should be cleared
      expect(window.alert).toHaveBeenCalledWith("Seuls les fichiers avec des extensions jpg, jpeg ou png sont autorisés.")
    })

    test("Then it should accept a file with a valid extension and call API to create a bill", async () => {
      const onNavigate = jest.fn()
      const store = mockStore
      const newBill = new NewBill({ document, onNavigate, store, localStorage: window.localStorage })

      const fileInput = screen.getByTestId('file')
      const file = new File(['dummy content'], 'sample.jpg', { type: 'image/jpeg' })

      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      fileInput.addEventListener('change', handleChangeFile)
      fireEvent.change(fileInput, { target: { files: [file] } })

      expect(handleChangeFile).toHaveBeenCalled()

      // Wait for the asynchronous operation to complete
      await waitFor(() => expect(newBill.fileUrl).toBeTruthy())
      expect(newBill.fileName).toBe('sample.jpg')
      expect(store.bills().create).toHaveBeenCalledTimes(1)
    })

    test("Then it should handle API error on file upload", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          create: () => {
            return Promise.reject(new Error("Erreur 500"))
          }
        }
      })

      const onNavigate = jest.fn()
      const store = mockStore
      const newBill = new NewBill({ document, onNavigate, store, localStorage: window.localStorage })

      const fileInput = screen.getByTestId('file')
      const file = new File(['dummy content'], 'sample.jpg', { type: 'image/jpeg' })

      const handleChangeFile = jest.fn(newBill.handleChangeFile)
      fileInput.addEventListener('change', handleChangeFile)
      fireEvent.change(fileInput, { target: { files: [file] } })

      expect(handleChangeFile).toHaveBeenCalled()

      // Wait for the promise to reject and ensure the error is logged
      await new Promise(process.nextTick)
      expect(console.error).toHaveBeenCalledWith(new Error("Erreur 500"))
    })

    // Test d'intégration POST new bill
    test("Then it should post the new bill and navigate to Bills page", async () => {
      const onNavigate = jest.fn()
      const store = mockStore
      const newBill = new NewBill({ document, onNavigate, store, localStorage: window.localStorage })

      const form = screen.getByTestId('form-new-bill')

      const handleSubmit = jest.fn(newBill.handleSubmit)
      form.addEventListener("submit", handleSubmit)

      fireEvent.submit(form)

      // Ensure that handleSubmit is called and API is hit
      expect(handleSubmit).toHaveBeenCalled()
      expect(store.bills().update).toHaveBeenCalledTimes(1)

      // Verify navigation after submission
      await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills']))
    })

    test("Then it should handle error when submitting the form", async () => {
      mockStore.bills.mockImplementationOnce(() => {
        return {
          update: () => {
            return Promise.reject(new Error("Erreur 500"))
          }
        }
      })

      const onNavigate = jest.fn()
      const store = mockStore
      const newBill = new NewBill({ document, onNavigate, store, localStorage: window.localStorage })

      const form = screen.getByTestId('form-new-bill')

      const handleSubmit = jest.fn(newBill.handleSubmit)
      form.addEventListener("submit", handleSubmit)

      fireEvent.submit(form)
      
      // Wait for the promise to reject and ensure the error is logged
      await new Promise(process.nextTick)
      expect(console.error).toHaveBeenCalledWith(new Error("Erreur 500"))
    })
  })
})
