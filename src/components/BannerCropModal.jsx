import { Image as ImageIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import Cropper from "react-easy-crop";

const OUTPUT_WIDTH = 1500;
const OUTPUT_HEIGHT = 600;

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function createCroppedFile(source, area) {
  const image = await loadImage(source);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext("2d", { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.96));
  if (!blob) throw new Error("Banner görseli hazırlanamadı.");
  return new File([blob], `banner-${Date.now()}.webp`, { type: "image/webp" });
}

export default function BannerCropModal({ file, onCancel, onApply }) {
  const [source, setSource] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setSource(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const apply = async () => {
    if (!croppedArea) return;
    setSaving(true);
    setError("");
    try {
      const croppedFile = await createCroppedFile(source, croppedArea);
      await onApply(croppedFile);
    } catch (reason) {
      setError(reason?.message || "Banner hazırlanamadı.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md" role="dialog" aria-modal="true"><section className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#17131f] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Banner Görselini Düzenle</h2><button type="button" onClick={onCancel} className="rounded-lg border border-white/10 p-2 text-white/55 hover:text-white"><X className="h-5 w-5" /></button></div><div className="relative mt-5 h-[380px] overflow-hidden rounded-xl bg-[#08070b]"><Cropper image={source} crop={crop} zoom={zoom} aspect={5 / 2} objectFit="contain" showGrid cropShape="rect" onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, pixels) => setCroppedArea(pixels)} /></div><div className="mt-5 flex items-center gap-3"><ImageIcon className="h-4 w-4 text-white/45" /><input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full accent-[#a967ff]" /><ImageIcon className="h-6 w-6 text-bull-neon" /></div><p className="mt-3 text-xs leading-5 text-white/45">Çerçeve içinde gördüğün 5:2 alan profile aynı oranla kaydedilir. Profil sayfası bu görselin tamamını gösterir; kayıt sonrasında ikinci bir kırpma uygulanmaz.</p>{error ? <p className="mt-3 rounded-lg border border-red-300/20 bg-red-400/10 p-3 text-xs font-bold text-red-100">{error}</p> : null}<div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="secondary-button py-3">İptal</button><button type="button" disabled={saving || !croppedArea} onClick={apply} className="primary-button py-3 disabled:opacity-50">{saving ? "Hazırlanıyor..." : "Uygula"}</button></div></section></div>;
}
