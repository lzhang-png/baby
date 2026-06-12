import { useEffect, useState } from "react"
import {
  ArrowLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  CopyIcon,
  LogOutIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { SchedulePanelContent } from "@/components/settings/schedule-panel-content"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { type AppLocale, setAppLanguage } from "@/lib/i18n"
import {
  getStoredTextSize,
  setAppTextSize,
  type TextSize,
} from "@/lib/text-size"

type SettingsView = "root" | "schedule"

type SettingsPanelProps = {
  open: boolean
}

const PANEL_SCROLL_CLASS =
  "max-h-[calc(88dvh-7rem)] overflow-y-auto overscroll-contain px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"

export function SettingsPanel({ open }: SettingsPanelProps) {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { user, household, signOut } = useAuth()
  const [view, setView] = useState<SettingsView>("root")
  const [themeReady, setThemeReady] = useState(false)
  const [textSize, setTextSize] = useState<TextSize>(() => getStoredTextSize())

  useEffect(() => {
    if (open) {
      setThemeReady(true)
      return
    }
    setView("root")
  }, [open])

  function copyInvite() {
    if (!household?.invite_code) return
    navigator.clipboard.writeText(household.invite_code)
    toast.success(t("family.inviteCopied"))
  }

  function handleLanguageChange(value: AppLocale) {
    setAppLanguage(value)
  }

  function handleTextSizeChange(value: TextSize) {
    setTextSize(value)
    setAppTextSize(value)
  }

  if (view === "schedule") {
    return (
      <>
        <DrawerHeader className="text-left">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label={t("common.back")}
              onClick={() => setView("root")}
            >
              <ArrowLeftIcon className="size-5" aria-hidden />
            </Button>
            <DrawerTitle className="text-left">
              {t("nav.schedule")}
            </DrawerTitle>
          </div>
        </DrawerHeader>
        <div className={PANEL_SCROLL_CLASS}>
          <SchedulePanelContent />
        </div>
      </>
    )
  }

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{t("family.title")}</DrawerTitle>
      </DrawerHeader>
      <div className={PANEL_SCROLL_CLASS}>
        <div className="flex flex-col gap-3 pb-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("nav.schedule")}</CardTitle>
              <CardDescription>{t("family.scheduleDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setView("schedule")}
              >
                <ClipboardListIcon data-icon="inline-start" />
                {t("family.viewSchedule")}
                <ChevronRightIcon
                  className="ml-auto size-4 opacity-60"
                  aria-hidden
                />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("common.language")}</CardTitle>
              <CardDescription>{t("family.languageDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentedControl
                value={i18n.language as AppLocale}
                onValueChange={handleLanguageChange}
                options={[
                  { value: "zh", label: t("common.chinese") },
                  { value: "en", label: t("common.english") },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("common.appearance")}</CardTitle>
              <CardDescription>{t("family.appearanceDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentedControl
                value={themeReady ? (theme ?? "dark") : "dark"}
                onValueChange={setTheme}
                options={[
                  { value: "light", label: t("common.light") },
                  { value: "medium", label: t("common.medium") },
                  { value: "dark", label: t("common.dark") },
                  { value: "system", label: t("common.system") },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("common.textSize")}</CardTitle>
              <CardDescription>{t("family.textSizeDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentedControl
                value={textSize}
                onValueChange={handleTextSizeChange}
                options={[
                  { value: "small", label: t("common.textSizeSmall") },
                  { value: "default", label: t("common.textSizeDefault") },
                  { value: "large", label: t("common.textSizeLarge") },
                ]}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("family.inviteCode")}</CardTitle>
              <CardDescription>{t("family.inviteCodeDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="font-mono text-2xl font-semibold tracking-widest">
                {household?.invite_code ?? "—"}
              </p>
              <Button variant="outline" onClick={copyInvite}>
                <CopyIcon data-icon="inline-start" />
                {t("common.copyCode")}
              </Button>
              <div className="border-t pt-3">
                <p className="text-sm font-medium">{t("family.howToAdd")}</p>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {t("family.howToAddDescription")}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("family.signedInAs")}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm">
                {t("family.household")}:{" "}
                <span className="font-medium">{household?.name}</span>
              </p>
              <Button variant="destructive" onClick={() => signOut()}>
                <LogOutIcon data-icon="inline-start" />
                {t("common.signOut")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
