import { createContext, useContext, useState, ReactNode } from 'react';

interface AdminContextProps {
  selectedHospitalId: number | 'ALL';
  setSelectedHospitalId: (id: number | 'ALL') => void;
}

const AdminContext = createContext<AdminContextProps | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | 'ALL'>(() => {
    const saved = localStorage.getItem('admin_selected_hospital');
    if (saved === 'ALL') return 'ALL';
    if (saved && !isNaN(Number(saved))) return Number(saved);
    return 'ALL';
  });

  const setAndSaveHospitalId = (id: number | 'ALL') => {
    setSelectedHospitalId(id);
    localStorage.setItem('admin_selected_hospital', id.toString());
  };

  return (
    <AdminContext.Provider value={{ selectedHospitalId, setSelectedHospitalId: setAndSaveHospitalId }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdminStore = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminStore must be used within an AdminProvider');
  }
  return context;
};
