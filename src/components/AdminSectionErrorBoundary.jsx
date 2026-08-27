import { Component } from "react";

export default class AdminSectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Yönetim bölümü görüntülenemedi", error, info);
  }

  render() {
    if (this.state.error) {
      return <div className="rounded-xl border border-red-400/20 bg-red-500/5 p-5">
        <h3 className="font-black text-red-200">Bu yönetim bölümü açılamadı</h3>
        <p className="mt-2 text-sm text-white/50">Beklenmeyen bir veri biçimiyle karşılaşıldı. Sayfanın geri kalanı kullanılabilir durumda.</p>
        <code className="mt-3 block break-all rounded-lg bg-black/30 p-3 text-xs text-red-200/70">{this.state.error?.message || "Bilinmeyen görüntüleme hatası"}</code>
        <button type="button" onClick={() => this.setState({ error: null })} className="secondary-button mt-4 px-4 py-2">Tekrar Dene</button>
      </div>;
    }
    return this.props.children;
  }
}
