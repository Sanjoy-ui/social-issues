import React from 'react';

export type UserRole = 'UNIVERSITY' | 'INDUSTRY' | 'GOVT' | 'CITIZEN';

interface RoleSelectorProps {
  selectedRole: UserRole;
  onChange: (role: UserRole) => void;
}

const roles: Array<{ id: UserRole; label: string }> = [
  { id: 'UNIVERSITY', label: 'University' },
  { id: 'INDUSTRY', label: 'Industry' },
  { id: 'GOVT', label: 'Govt Nodal' },
  { id: 'CITIZEN', label: 'Citizen' },
];

export const RoleSelector: React.FC<RoleSelectorProps> = ({ selectedRole, onChange }) => {
  return (
    <div className="w-full mb-6">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
        Select Portal
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200/80">
        {roles.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onChange(role.id)}
              className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer text-center ${
                isSelected
                  ? 'bg-white text-indigo-600 shadow-sm border border-gray-200/60 scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              {role.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
