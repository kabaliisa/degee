// Metro turns imported images into a value React Native's <Image> accepts.
declare module '*.jpg' {
  const source: import('react-native').ImageSourcePropType;
  export default source;
}
