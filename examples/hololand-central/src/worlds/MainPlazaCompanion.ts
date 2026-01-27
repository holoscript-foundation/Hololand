/**
 * Main Plaza Companion
 * Sidecar logic for the central hub world.
 */
export const MainPlazaCompanion = {
  currentTheme: 'city',
  setThemeUpdater: null as ((t: string) => void) | null,
  
  cycleTheme: () => {
    const themes = ['sunset', 'forest', 'studio', 'apartment', 'city', 'dawn', 'night'];
    const nextIndex = (themes.indexOf(MainPlazaCompanion.currentTheme) + 1) % themes.length;
    MainPlazaCompanion.currentTheme = themes[nextIndex];
    
    console.log(`Global Theme Changed: ${MainPlazaCompanion.currentTheme}`);
    if (MainPlazaCompanion.setThemeUpdater) {
      MainPlazaCompanion.setThemeUpdater(MainPlazaCompanion.currentTheme);
    }
  },

  onPortalActivate: (target: string) => {
    console.log(`MainPlaza: Opening portal to ${target}`);
  }
};
