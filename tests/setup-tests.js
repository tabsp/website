require("@testing-library/jest-dom")

global.___loader = {
  enqueue: jest.fn(),
  hovering: jest.fn(),
}

global.___navigate = jest.fn()

afterEach(() => {
  jest.clearAllMocks()
})
