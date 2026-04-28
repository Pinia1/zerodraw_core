// const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';
// const STORAGE_KEY = 'cat-theme';
enum Theme {
  DARK = 'dark',
  LIGHT = 'light',
}
const useMediaQuery = () => {
  // const [theme, setTheme] = useLocalStorageState<Theme>(STORAGE_KEY, {
  //   defaultValue: Theme.DARK,
  // });

  // const setSystemTheme = useMemoizedFn((e: MediaQueryListEvent) => {
  //   setTheme(e.matches ? Theme.DARK : Theme.LIGHT);
  // });

  // useEffect(() => {
  //   const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
  //   setTheme(mediaQuery.matches ? Theme.DARK : Theme.LIGHT);
  //   window.matchMedia(SYSTEM_THEME_QUERY).addEventListener('change', setSystemTheme);
  //   return () => {
  //     window.matchMedia(SYSTEM_THEME_QUERY).removeEventListener('change', setSystemTheme);
  //   };
  // }, []);

  return [Theme.DARK, () => {}];
};

export default useMediaQuery;
