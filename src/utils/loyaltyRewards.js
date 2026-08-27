export function getMissionReward(mission, loyaltyXp = 0, earnsBp = true) {
  const bpMultiplier = loyaltyXp >= 5000 ? 1.2 : loyaltyXp >= 1000 ? 1.05 : 1;
  const xpMultiplier = loyaltyXp >= 1000 ? 1.05 : 1;
  return {
    bp: earnsBp ? Math.ceil(mission.bpReward * bpMultiplier) : 0,
    xp: Math.ceil(mission.xpReward * xpMultiplier),
    hasBonus: bpMultiplier > 1 || xpMultiplier > 1
  };
}
