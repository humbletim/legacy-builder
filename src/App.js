import React, { useState, useEffect } from 'react';
import { SafeAreaView, Button, StyleSheet, View, Text, PermissionsAndroid } from 'react-native';
import { WebView } from 'react-native-webview';
import { pick, types } from '@react-native-documents/picker';
import RNFS from 'react-native-fs'; // react-native-fs
import buildInfo from './build-info';

const App = () => {
  // State to hold the HTML content, not a path
  const [htmlContent, setHtmlContent] = useState(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const testModePath = RNFS.DownloadDirectoryPath + '/test.html';
    const checkTestFile = async () => {
      if (await RNFS.exists(testModePath)) {
        const content = await RNFS.readFile(testModePath, 'utf8');
        setBaseUrl('file://' + testModePath);
        setHtmlContent(content);
      }
    };
    checkTestFile();
  }, []);

  const loadHtmlFile = async () => {
    setError(null); // Clear previous errors
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        {
          title: "File Access Permission",
          message: "This app needs access to your files to load HTML.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK"
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        // 1. Let user pick an HTML file
        const [result] = await pick({
          type: [types.html],
        });

        // result.uri is the 'content://' path
        const fileUri = result.uri;

        // 2. Read the file's content from the URI
        const content = await RNFS.readFile(fileUri, 'utf8');

        // 3. Set the HTML content in state to trigger re-render
        setBaseUrl(fileUri);
        setHtmlContent(content);
      } else {
        setError("File access permission denied.");
      }
    } catch (err) {
      if (err.code === 'DOCUMENT_PICKER_CANCELED') {
        // User cancelled the picker
        console.log('User cancelled picker');
      } else {
        // Handle other errors
        console.error('Unknown Error: ', err);
        setError('Failed to load file. Please try again.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* This is a simple "main menu"
        We show the button if no HTML is loaded.
      */}
      {!htmlContent ? (
        <View style={styles.menu}>
          <Text style={styles.title}>My Static App Viewer</Text>
          <Button title="Load Local HTML File" onPress={loadHtmlFile} />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.buildInfoContainer}>
            <Text style={styles.buildInfoText}>
              Build: {buildInfo.date} ({buildInfo.hash})
            </Text>
          </View>
        </View>
      ) : (
        /* Once HTML is loaded, we show the WebView.
          Note we use 'source={{ html: ... }}'
        */
        <WebView
          originWhitelist={['*']} // Allows all origins
          source={{ html: htmlContent, baseUrl: baseUrl }} // baseUrl is good practice
          javaScriptEnabled={true}
          domStorageEnabled={true}
          // Add props here for sensor access if your HTML needs it
          // mediaPlaybackRequiresUserAction={false} // for <audio>
          // geolocationEnabled={true} // for location
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  menu: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorText: {
    marginTop: 10,
    color: 'red',
  },
  buildInfoContainer: {
    position: 'absolute',
    right: 10,
    bottom: 10,
  },
  buildInfoText: {
    fontSize: 10,
    color: 'grey',
  },
});

export default App;
