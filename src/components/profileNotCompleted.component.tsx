import React, {useEffect, Component} from 'react';
import { Linking, Text, View, Alert, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { globalStyles, themeStyles } from '@styles';
import { backgroundColor } from '../common/values/colors';
import { globals } from '../globals/globals';

class ProfileNotCompletedComponent extends Component {
    state = {
        verifyPhoneUrl: 'https://diamondapp.com/update-profile'// 'https://identity.deso.org/verify-phone-number?public_key=' + globals.user.publicKey 
    }

    componentDidMount(){
        Linking.openURL(this.state.verifyPhoneUrl)
    }

    render(){

        console.log('verifyn, verify phone url = ', this.state.verifyPhoneUrl)

        return (
            <View style={[
                         globalStyles.profileNotCompletedContainer,
                         { backgroundColor: backgroundColor.commonScreenBackground, paddingTop: 0 }
                     ]}>
                      
             <WebView style={{ 
                    height: Dimensions.get('window').height, 
                    width: Dimensions.get('window').width}} 
                    source={{ uri: this.state.verifyPhoneUrl }} 
                /> 
            </View>
        )
    }
}

export default ProfileNotCompletedComponent

// export function ProfileNotCompletedComponent(): JSX.Element {

//     useEffect(() => {
        
//     });

//     return <View style={[
//         globalStyles.profileNotCompletedContainer,
//         { backgroundColor: backgroundColor.commonScreenBackground }
//     ]}>
//         <WebView source={{ uri: 'https://reactnative.dev/' }} />
//         {/* <Text style={
//             [globalStyles.profileNotCompletedText,
//             { color: themeStyles.fontColorMain.color }
//             ]}
//         >Your profile has not been completed yet. Please visit the official website to update your profile.</Text>
//         <TouchableOpacity
//             style={globalStyles.profileNotCompletedButton}
//             onPress={() => Linking.openURL('https://bitclout.com/')}>
//             <Text style={{ color: 'white' }}>Go to Website</Text>
//         </TouchableOpacity> */}
//     </View>;
// }
