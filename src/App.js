import React, { useState, useEffect } from 'react';
import { SafeAreaView, Button, StyleSheet, View, Text } from 'react-native';
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
      // 1. Let user pick an HTML file
      const [result] = await pick({
        // THIS IS THE FIX:
        // Use a generic type because [types.html] is too specific
        // and causes a native crash on many systems.
        type: [types.allFiles], 
        copyTo: 'cachesDirectory', // Keep this from the (correct) previous suggestion
      });

      setError('load file: ' + [result.fileCopyUri, result.uri]);
      if (!result.fileCopyUri) {
        throw new Error('Failed to copy file to cache.');
      }

      // 2. Read the file's content from the local cache copy
      const content = await RNFS.readFile(result.fileCopyUri, 'utf8');

      // 3. Set the HTML content in state
      setBaseUrl(result.uri); // Use original URI for baseUrl
      setHtmlContent(content);

    } catch (err) {
      setError('Failed to load file. Error: ' + err.message);
      if (err.code === 'DOCUMENT_PICKER_CANCELED') {
        // User cancelled the picker
        console.log('User cancelled picker');
      } else {
        // Handle other errors
        console.error('Unknown Error: ', err);
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
