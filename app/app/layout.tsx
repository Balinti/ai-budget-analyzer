import { AppWrapper } from '@/components/AppWrapper'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppWrapper>{children}</AppWrapper>
}
