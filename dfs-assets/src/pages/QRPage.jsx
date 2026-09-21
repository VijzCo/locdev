// src/pages/QRPage.jsx
import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { fetchAssets } from '@/services/firebase/assets'
import { useAuth } from '@/context/AuthContext'
import { PageHeader, EmptyState, LoadingSpinner } from '@/components/ui'

export default function QRPage() {
  const { user }    = useAuth()
  const [assets, setAssets]     = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading]   = useState(true)
  const stickerRef = useRef(null)

  useEffect(() => {
    fetchAssets(user).then(a => {
      setAssets(a)
      if (a.length > 0) setSelected(a[0])
      setLoading(false)
    })
  }, [])

  function printSticker() {
    const html = stickerRef.current?.innerHTML
    if (!html) return
    const win = window.open('', '_blank', 'width=400,height=500')
    win.document.write(`<!DOCTYPE html>
<html><head><title>Asset Label — ${selected?.assetId}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f8f8f6; display: flex; align-items: center; justify-content: center; min-height: 100vh; font-family: 'IBM Plex Mono', monospace; }
  .sticker { background: #fff; border: 2px solid #111; border-radius: 12px; padding: 20px; width: 280px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
  .company { font-family: Syne, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #444; border-bottom: 2px solid #e2520a; padding-bottom: 6px; width: 100%; text-align: center; }
  .qr-wrap { background: #fff; padding: 8px; border: 1px solid #eee; border-radius: 8px; }
  .fields { width: 100%; }
  .field-row { display: flex; justify-content: space-between; align-items: baseline; padding: 4px 0; border-bottom: 1px solid #f0f0ec; }
  .field-row:last-child { border-bottom: none; }
  .field-key { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #999; }
  .field-val { font-size: 11px; font-weight: 600; color: #111; text-align: right; max-width: 150px; word-break: break-all; }
  @media print { body { background: #fff; } .sticker { box-shadow: none; } }
</style></head>
<body><div class="sticker">${html}</div>
<script>setTimeout(() => window.print(), 600);<\/script>
</body></html>`)
    win.document.close()
  }

  const qrUrl = selected
    ? `${window.location.origin}/assets?id=${selected.assetId}`
    : ''

  return (
    <div>
      <PageHeader
        title="QR Label Generator"
        subtitle="Generate and print asset identification labels"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="card p-5">
          <div className="card-header">Select Asset</div>
          {loading ? <LoadingSpinner /> : (
            <>
              <select
                className="select mb-6"
                value={selected?.id || ''}
                onChange={e => setSelected(assets.find(a => a.id === e.target.value) || null)}
              >
                {assets.map(a => (
                  <option key={a.id} value={a.id}>{a.name} — {a.assetId}</option>
                ))}
              </select>

              {/* STICKER PREVIEW */}
              {selected ? (
                <div>
                  <div className="font-mono text-xs text-dark-500 uppercase tracking-widest mb-3">Label Preview</div>
                  <div className="bg-dark-900 border border-dark-700 rounded-xl p-5 flex justify-center mb-5">
                    {/* This inner div is what gets printed */}
                    <div
                      ref={stickerRef}
                      className="bg-white rounded-xl p-5 flex flex-col items-center gap-3.5"
                      style={{ width: 240, border: '2px solid #111' }}
                    >
                      {/* Company header */}
                      <div style={{
                        fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 10,
                        letterSpacing: '0.15em', textTransform: 'uppercase', color: '#555',
                        borderBottom: '2px solid #e2520a', paddingBottom: 6,
                        width: '100%', textAlign: 'center',
                      }}>
                        DutyFreeSourcing Inc.
                      </div>

                      {/* QR Code */}
                      <div style={{ background: '#fff', padding: 8, border: '1px solid #eee', borderRadius: 8 }}>
                        <QRCodeSVG value={qrUrl} size={120} level="H" />
                      </div>

                      {/* Asset Info Fields */}
                      <div style={{ width: '100%', fontFamily: 'IBM Plex Mono, monospace' }}>
                        {[
                          ['Brand',    selected.brand],
                          ['Model',    selected.model],
                          ['Asset ID', selected.assetId],
                          ['S/N',      selected.serialNumber],
                        ].map(([key, val]) => (
                          <div key={key} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid #f0eeea' }}>
                            <span style={{ fontSize: 9, textTransform:'uppercase', letterSpacing:'0.06em', color:'#999' }}>{key}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, color:'#111', textAlign:'right', maxWidth:140, wordBreak:'break-all' }}>{val || '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="btn flex-1 justify-center" onClick={printSticker}>⎙ Print Label</button>
                    <button className="btn btn-primary flex-1 justify-center" onClick={printSticker}>⬇ Download</button>
                  </div>
                </div>
              ) : (
                <EmptyState icon="⊡" title="Select an asset above" />
              )}
            </>
          )}
        </div>

        {/* Asset detail panel */}
        <div className="card p-5">
          <div className="card-header">Asset Details</div>
          {selected ? (
            <div className="space-y-3">
              {[
                ['Asset ID',     selected.assetId],
                ['Name',         selected.name],
                ['Brand',        selected.brand],
                ['Model',        selected.model],
                ['Serial No.',   selected.serialNumber],
                ['Category',     selected.category],
                ['Department',   selected.department],
                ['Status',       selected.status],
              ].map(([key, val]) => (
                <div key={key} className="flex items-center justify-between py-2.5 border-b border-dark-700 last:border-0">
                  <span className="text-xs font-mono text-dark-500 uppercase tracking-wider">{key}</span>
                  <span className="font-mono text-sm text-dark-100">{val || '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="◈" title="No asset selected" />
          )}

          {selected && (
            <div className="mt-5 pt-5 border-t border-dark-700">
              <div className="card-header">QR URL</div>
              <div className="bg-dark-900 border border-dark-700 rounded-lg p-3">
                <p className="font-mono text-xs text-dark-400 break-all">{qrUrl}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
