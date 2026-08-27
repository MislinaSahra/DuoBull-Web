/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#05090c",
        night: "#090f13",
        ink: "#0d1419",
        bull: {
          purple: "#ff4d00",
          neon: "#ff6a00",
          deep: "#742700",
          gold: "#f29d38",
          amber: "#ff7a18"
        }
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Bahnschrift", "Arial Narrow", "Inter", "sans-serif"]
      },
      boxShadow: {
        neon: "0 18px 60px rgba(0,0,0,.34), 0 0 35px rgba(255,90,0,.08)",
        gold: "0 0 35px rgba(242,157,56,.18)"
      },
      backgroundImage: {
        "radial-bull":
          "radial-gradient(circle at 20% 20%, rgba(255,90,0,.14), transparent 28%), radial-gradient(circle at 80% 0%, rgba(242,157,56,.08), transparent 24%), linear-gradient(135deg, #05090c 0%, #090f13 46%, #05090c 100%)"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" }
        },
        pulseGlow: {
          "0%, 100%": { opacity: ".55" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        pulseGlow: "pulseGlow 3s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
