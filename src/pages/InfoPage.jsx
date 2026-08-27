import PageHero from "../components/PageHero.jsx";

export default function InfoPage({ kicker, eyebrow, title, description }) {
  return (
    <PageHero
      kicker={kicker}
      eyebrow={eyebrow}
      title={title}
      description={description}
    />
  );
}
