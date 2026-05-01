import React from 'react';

// Warning icon (for "Nguy cơ mất việc")
export const WarningIcon = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 19C1.55 19.35 1.64 19.69 1.82 20C2 20.3 2.26 20.56 2.56 20.74C2.86 20.92 3.2 21.01 3.55 21H20.45C20.8 21.01 21.14 20.92 21.44 20.74C21.74 20.56 22 20.3 22.18 20C22.36 19.69 22.45 19.35 22.45 19C22.45 18.64 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.27 3.32 12.97 3.15C12.67 2.98 12.34 2.89 12 2.89C11.66 2.89 11.33 2.98 11.03 3.15C10.73 3.32 10.47 3.56 10.29 3.86Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Competition icon (for "Cạnh tranh khốc liệt")
export const CompetitionIcon = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17.5 21H6.5C5.67 21 5 20.33 5 19.5V19C5 18.72 5.18 18.47 5.43 18.35L9.5 16.75V15C9.5 14.17 10.17 13.5 11 13.5H13C13.83 13.5 14.5 14.17 14.5 15V16.75L18.57 18.35C18.82 18.47 19 18.72 19 19V19.5C19 20.33 18.33 21 17.5 21Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 13.5V11C10 10.17 10.67 9.5 11.5 9.5H12.5C13.33 9.5 14 10.17 14 11V13.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M19.5 15.5V13.5C19.5 12.67 18.83 12 18 12H17.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 15.5V13.5C4.5 12.67 5.17 12 6 12H6.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 6V3"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 3H14"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Compass icon (for "Thiếu định hướng")
export const CompassIcon = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polygon
      points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Star icon (for badge)
export const StarIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      fill="currentColor"
    />
  </svg>
);

// Mail icon
export const MailIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3 8L10.8906 13.2604C11.5624 13.7083 12.4376 13.7083 13.1094 13.2604L21 8M5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Lock icon
export const LockIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Phone icon
export const PhoneIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4742 21.8325 20.7294C21.7209 20.9846 21.5573 21.2136 21.3521 21.4019C21.1468 21.5901 20.9046 21.7335 20.6408 21.8227C20.3769 21.9119 20.0974 21.9451 19.82 21.92C16.7428 21.5856 13.787 20.5341 11.19 18.85C8.77382 17.3147 6.72533 15.2662 5.19 12.85C3.49998 10.2412 2.44824 7.27099 2.12 4.22C2.09501 3.94347 2.12787 3.66502 2.2165 3.40162C2.30513 3.13822 2.44757 2.89562 2.63476 2.68962C2.82194 2.48361 3.04981 2.31881 3.30379 2.20572C3.55778 2.09262 3.83234 2.03388 4.11 2.03H7.11C7.59531 2.02732 8.06579 2.21007 8.43376 2.5395C8.80173 2.86894 9.03983 3.32045 9.1 3.81C9.23662 4.93777 9.47145 6.05255 9.8 7.14C9.92454 7.66932 9.97345 8.21768 9.94462 8.76462C9.91578 9.31156 9.7097 9.84698 9.37 10.35L8.07 12.35C9.88945 15.4438 12.5562 17.1106 15.65 18.93L17.65 17.63C18.1531 17.2903 18.6885 17.0842 19.2355 17.0554C19.7824 17.0266 20.3308 17.0755 20.86 17.2C21.9474 17.5286 23.0622 17.7634 24.19 17.9C24.6868 17.9606 25.1452 18.2035 25.4732 18.5804C25.8013 18.9573 25.9769 19.4396 25.97 19.94V16.92H22Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default {
  WarningIcon,
  CompetitionIcon,
  CompassIcon,
  StarIcon,
};
