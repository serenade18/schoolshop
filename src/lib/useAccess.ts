import { roleDef, type OrgType } from "@/lib/access"
import { useAuthStore } from "@/stores/auth"

/** What the signed-in staff member may do in their organisation. */
export function useAccess() {
  const membership = useAuthStore((s) => s.user?.memberships[0])
  const orgType = (membership?.orgType ?? "school") as OrgType
  const permissions = membership?.permissions ?? []
  return {
    orgType,
    roleId: membership?.staffRole ?? "",
    roleLabel: (membership && roleDef(orgType, membership.staffRole)?.label) ?? "",
    classNames: membership?.classNames ?? [],
    can: (permission: string) => permissions.includes(permission),
  }
}
