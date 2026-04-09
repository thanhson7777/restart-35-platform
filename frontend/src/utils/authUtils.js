

const RETURN_URL_KEY = 'returnUrlAfterLogin'

export const authUtils = {

  saveReturnUrl: (url = window.location.href) => {
    sessionStorage.setItem(RETURN_URL_KEY, url)
  },

  getReturnUrl: () => {
    return sessionStorage.getItem(RETURN_URL_KEY)
  },

  clearReturnUrl: () => {
    sessionStorage.removeItem(RETURN_URL_KEY)
  },

  hasReturnUrl: () => {
    return !!sessionStorage.getItem(RETURN_URL_KEY)
  }
}
