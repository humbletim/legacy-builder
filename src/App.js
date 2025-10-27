import React from 'react';
import {SafeAreaView, StatusBar, Text, useColorScheme} from 'react-native';

const App = () => {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? '#333' : '#FFF',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  };

  const textStyle = {
    color: isDarkMode ? '#FFF' : '#333',
    fontSize: 24,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Text style={textStyle}>Hello, World!</Text>
    </SafeAreaView>
  );
};

export default App;
