export const interceptorLoadingElement = (calling) => {
  const elements = document.querySelectorAll('.interceptor-loading')

  for (let i = 0; i < elements.length; i++) {
    if (calling) {
      elements[i].style.opacity = '0.5'
      elements[i].style.pointerEvents = 'none'
    } else {
      elements[i].style.opacity = ''
      elements[i].style.pointerEvents = ''
    }
  }
}
export const generateSlug = (text) => {
  return text.toString().toLowerCase()
    .normalize('NFD') 
    .replace(/[\u0300-\u036f]/g, '') 
    .replace(/[đĐ]/g, 'd')
    .replace(/([^0-9a-z-\s])/g, '') 
    .replace(/(\s+)/g, '-') 
    .replace(/-+/g, '-') 
    .replace(/^-+|-+$/g, ''); 
};
