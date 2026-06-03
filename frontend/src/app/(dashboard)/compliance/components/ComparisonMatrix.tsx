'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/use-translation'

export interface ComparisonMatrixProps {
  setMatrixCompare: (value: boolean) => void
}

export function ComparisonMatrix({
  setMatrixCompare,
}: ComparisonMatrixProps) {
  const { t } = useTranslation()

  return (
    <Card className="shadow-2xl border-white/5 bg-slate-900/80 backdrop-blur-md overflow-hidden">
      <CardHeader className="border-b border-white/5 bg-slate-950/20 p-5 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold font-mono uppercase tracking-wider text-cyan-400">
            {t('compliance.matrixTitle')}
          </CardTitle>
          <CardDescription className="text-xs">
            {t('compliance.matrixDesc')}
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setMatrixCompare(false)}
          className="border-white/10 hover:bg-sidebar-accent font-mono text-xs uppercase"
        >
          {t('compliance.closeCompare')}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-white/5 bg-slate-950/44 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
                <th className="p-4 border-r border-white/5 w-1/4">{t('compliance.controlDomain')}</th>
                <th className="p-4 border-r border-white/5 w-1/4">{t('compliance.iecCode')}</th>
                <th className="p-4 border-r border-white/5 w-1/4">{t('compliance.nistIndex')}</th>
                <th className="p-4 w-1/4">{t('compliance.nercRequirement')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-slate-800/20 transition-all">
                <td className="p-4 border-r border-white/5 font-bold text-slate-300">
                  {t('compliance.domains.boundaryProtection')}
                </td>
                <td className="p-4 border-r border-white/5 text-cyan-400/90">{t('compliance.sr51')}</td>
                <td className="p-4 border-r border-white/5 text-amber-400/90">{t('compliance.section623')}</td>
                <td className="p-4 text-slate-400">{t('compliance.cip0057_perimeter')}</td>
              </tr>
              <tr className="hover:bg-slate-800/20 transition-all">
                <td className="p-4 border-r border-white/5 font-bold text-slate-300">
                  {t('compliance.domains.networkSegmentation')}
                </td>
                <td className="p-4 border-r border-white/5 text-cyan-400/90">{t('compliance.sr52')}</td>
                <td className="p-4 border-r border-white/5 text-amber-400/90">{t('compliance.section624')}</td>
                <td className="p-4 text-slate-400">{t('compliance.cip0057_isolation')}</td>
              </tr>
              <tr className="hover:bg-slate-800/20 transition-all">
                <td className="p-4 border-r border-white/5 font-bold text-slate-300">
                  {t('compliance.domains.fieldZoneSecurity')}
                </td>
                <td className="p-4 border-r border-white/5 text-cyan-400/90">{t('compliance.sr54')}</td>
                <td className="p-4 border-r border-white/5 text-amber-400/90">{t('compliance.section625')}</td>
                <td className="p-4 text-slate-400">{t('compliance.cip0066_field')}</td>
              </tr>
              <tr className="hover:bg-slate-800/20 transition-all">
                <td className="p-4 border-r border-white/5 font-bold text-slate-300">
                  {t('compliance.domains.accessManagement')}
                </td>
                <td className="p-4 border-r border-white/5 text-cyan-400/90">{t('compliance.sr11')}</td>
                <td className="p-4 border-r border-white/5 text-amber-400/90">{t('compliance.section611')}</td>
                <td className="p-4 text-slate-400">{t('compliance.cip0046_personnel')}</td>
              </tr>
              <tr className="hover:bg-slate-800/20 transition-all">
                <td className="p-4 border-r border-white/5 font-bold text-slate-300">
                  {t('compliance.domains.incidentLogging')}
                </td>
                <td className="p-4 border-r border-white/5 text-cyan-400/90">{t('compliance.sr61')}</td>
                <td className="p-4 border-r border-white/5 text-amber-400/90">{t('compliance.section632')}</td>
                <td className="p-4 text-slate-400">{t('compliance.cip0076_logging')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
