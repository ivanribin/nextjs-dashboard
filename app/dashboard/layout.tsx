import SideNav from "@/app/ui/dashboard/sidenav";
import { type ReactNode, type ReactElement } from "react";

interface IDashboardLayoutProps {
    children: ReactNode;
}

const DashboardLayout = ({ children }: IDashboardLayoutProps): ReactElement => {
    return (
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
            <div className="w-full flex-none md:w-64">
                <SideNav />
            </div>
            <div className="flex-grow p-6 md:overflow-y-auto md:p-12">
                {children}
            </div>
        </div>
    );
};

export default DashboardLayout;
