import { useEffect, useState } from "react"
import { CopyIcon, LogOutIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type AppLocale, setAppLanguage } from "@/lib/i18n"
import {
  getStoredTextSize,
  setAppTextSize,
  type TextSize,
} from "@/lib/text-size"

export function FamilyPage() {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useTheme()
  const { user, household, signOut } = useAuth()
  const [themeReady, setThemeReady] = useState(false)
  const [textSize, setTextSize] = useState<TextSize>(() => getStoredTextSize())

  useEffect(() => {
    setThemeReady(true)
  }, [])

  function copyInvite() {
    if (!household?.invite_code) return
    navigator.clipboard.writeText(household.invite_code)
    toast.success(t("family.inviteCopied"))
  }

  function handleLanguageChange(value: string) {
    setAppLanguage(value as AppLocale)
  }

  function handleTextSizeChange(value: string) {
    const size = value as TextSize
    setTextSize(size)
    setAppTextSize(size)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t("family.title")}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("common.language")}</CardTitle>
          <CardDescription>{t("family.languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="zh">{t("common.chinese")}</SelectItem>
                <SelectItem value="en">{t("common.english")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("common.appearance")}</CardTitle>
          <CardDescription>{t("family.appearanceDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={themeReady ? (theme ?? "dark") : "dark"}
            onValueChange={setTheme}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="light">{t("common.light")}</SelectItem>
                <SelectItem value="dark">{t("common.dark")}</SelectItem>
                <SelectItem value="system">{t("common.system")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("common.textSize")}</CardTitle>
          <CardDescription>{t("family.textSizeDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={textSize} onValueChange={handleTextSizeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="small">{t("common.textSizeSmall")}</SelectItem>
                <SelectItem value="default">
                  {t("common.textSizeDefault")}
                </SelectItem>
                <SelectItem value="large">{t("common.textSizeLarge")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
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
  )
}
