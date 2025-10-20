import { useLocation } from "wouter";
import { ArrowLeft, ChevronRight, Key, Shield, ShieldCheck, HelpCircle, Headphones, AlertCircle, Info, FileText, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const [, setLocation] = useLocation();
  
  const settingsSections = [
    {
      title: "ACCOUNT",
      items: [
        {
          id: "password",
          label: "Change Password",
          icon: Key,
          onClick: () => console.log("Change password"),
        },
        {
          id: "privacy",
          label: "Privacy",
          icon: Shield,
          onClick: () => console.log("Privacy settings"),
        },
        {
          id: "security",
          label: "Security",
          icon: ShieldCheck,
          onClick: () => console.log("Security settings"),
        },
      ],
    },
    {
      title: "HELP & SUPPORT",
      items: [
        {
          id: "faq",
          label: "FAQ",
          icon: HelpCircle,
          onClick: () => console.log("FAQ"),
        },
        {
          id: "contact",
          label: "Contact Us",
          icon: Headphones,
          onClick: () => console.log("Contact us"),
        },
        {
          id: "report",
          label: "Report a Problem",
          icon: AlertCircle,
          onClick: () => console.log("Report problem"),
        },
      ],
    },
    {
      title: "ABOUT",
      items: [
        {
          id: "version",
          label: "Version",
          icon: Info,
          value: "1.0.0",
          onClick: () => {},
        },
        {
          id: "terms",
          label: "Terms of Service",
          icon: FileText,
          onClick: () => console.log("Terms of service"),
        },
        {
          id: "privacy-policy",
          label: "Privacy Policy",
          icon: ShieldAlert,
          onClick: () => console.log("Privacy policy"),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background border-b border-border z-10">
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => setLocation("/profile")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Settings</h1>
        </div>
      </div>

      <div className="pb-8">
        {settingsSections.map((section, sectionIndex) => (
          <div key={section.title} className={sectionIndex > 0 ? "mt-8" : "mt-0"}>
            <p className="text-xs font-semibold text-muted-foreground px-4 py-3 uppercase">
              {section.title}
            </p>
            <div className="bg-background">
              {section.items.map((item, itemIndex) => {
                const IconComponent = item.icon;
                const isLast = itemIndex === section.items.length - 1;

                return (
                  <button
                    key={item.id}
                    onClick={item.onClick}
                    className={`w-full flex items-center gap-4 px-4 py-4 hover-elevate active-elevate-2 ${
                      !isLast ? "border-b border-border" : ""
                    }`}
                    data-testid={`button-${item.id}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                    </div>
                    {item.value ? (
                      <p className="text-sm text-muted-foreground">{item.value}</p>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-8 px-4">
          <Button
            variant="outline"
            className="w-full justify-center gap-2 text-destructive border-destructive hover:bg-destructive/10 h-12"
            data-testid="button-logout"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
}
