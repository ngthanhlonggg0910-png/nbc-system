import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { getCompanySettings } from "@/api/company-settings.api";
import { setSystemConfig } from "@/redux/userSlice";

export function Brand() {
  const dispatch = useDispatch();
  const systemConfig = useSelector((state) => state.user.systemConfig);
  const authenticated = useSelector(
    (state) => state.user.session?.authenticated,
  );
  const companyName = systemConfig?.companyName || "Nhabe Corporation";
  const logoUrl = systemConfig?.companyLogo || "/nbc-logo.png";

  React.useEffect(() => {
    if (!authenticated) return;

    let active = true;

    getCompanySettings()
      .then((settings) => {
        if (!active || !settings) return;

        dispatch(
          setSystemConfig({
            ...systemConfig,
            companyName: settings.company_name ?? systemConfig.companyName,
            companyLogo:
              settings.logo_display_url ||
              settings.logo_url ||
              "/nbc-logo.png",
            companyLogoKey: settings.logo_url ?? null,
          }),
        );
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [authenticated, dispatch]);

  return (
    <div className="brand" aria-label={companyName}>
      <img
        src={logoUrl}
        alt={`Logo ${companyName}`}
        onError={(event) => {
          event.currentTarget.src = "/nbc-logo.png";
        }}
      />
    </div>
  );
}
