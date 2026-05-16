import toast from 'react-hot-toast';

export const useToast = () => {
  return {
    success: (message) => toast.success(message),
    error: (message) => toast.error(message),
    loading: (message) => toast.loading(message),
    info: (message) => toast(message),
    dismiss: (toastId) => toast.dismiss(toastId),
  };
};
