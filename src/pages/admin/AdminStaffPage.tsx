import { StaffManager } from "@/components/staff/StaffManager"

export function AdminStaffPage() {
  return <StaffManager scope="admin" orgType="platform" title="Staff & roles" eyebrow="SchoolShop's own team and what each role can do" />
}
