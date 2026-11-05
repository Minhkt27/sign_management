import { createContext, useContext, useState, ReactNode } from 'react';
import { ADMIN_SELECTED_HOSPITAL_KEY } from '@/services/targetHospital';

interface AdminContextProps {
  selectedHospitalId: number | null;
  setSelectedHospitalId: (id: number | null) => void;
}

const AdminContext = createContext<AdminContextProps | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(() => {
    const saved = localStorage.getItem(ADMIN_SELECTED_HOSPITAL_KEY);
    // "ALL" là giá trị cũ trước khi bỏ tùy chọn "Tất cả bệnh viện" — coi như chưa chọn gì.
    if (saved && !isNaN(Number(saved))) return Number(saved);
    return null;
  });

  const setAndSaveHospitalId = (id: number | null) => {
    setSelectedHospitalId(id);
    if (id === null) {
      localStorage.removeItem(ADMIN_SELECTED_HOSPITAL_KEY);
    } else {
      localStorage.setItem(ADMIN_SELECTED_HOSPITAL_KEY, id.toString());
    }
  };

  return (
    <AdminContext.Provider value={{ selectedHospitalId, setSelectedHospitalId: setAndSaveHospitalId }}>
      {children}
    </AdminContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdminStore = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminStore must be used within an AdminProvider');
  }
  return context;
};
