import { PERMISSION_GROUPS } from '@/shared/constants/permissions';
import { Checkbox } from '@/components/ui/checkbox';

interface Props {
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
}

export function PermissionMatrix({ selectedPermissions, onChange, disabled }: Props) {
  const togglePermission = (id: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedPermissions, id]);
    } else {
      onChange(selectedPermissions.filter(p => p !== id));
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.group} className="border border-slate-200 rounded-lg p-4 bg-white">
          <h4 className="font-semibold text-sm text-slate-800 mb-3">{group.group}</h4>
          <div className="space-y-2.5">
            {group.permissions.map((perm) => (
              <div key={perm.id} className="flex items-start space-x-2">
                <Checkbox
                  id={`perm-${perm.id}`}
                  checked={selectedPermissions.includes(perm.id)}
                  onCheckedChange={(c: boolean | string) => togglePermission(perm.id, c === true)}
                  disabled={disabled}
                />
                <label
                  htmlFor={`perm-${perm.id}`}
                  className="text-sm text-slate-600 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer pt-0.5"
                >
                  {perm.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
