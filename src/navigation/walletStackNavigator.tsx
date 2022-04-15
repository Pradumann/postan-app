import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { Platform } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { themeStyles } from '@styles';
import { WalletScreen } from '@screens/wallet/wallet.screen';
import { LogoHeaderComponent } from '@components/logoHeader.component';
import { stackConfig } from './stackNavigationConfig';
import { SharedStackScreens } from './sharedStackScreens';

const WalletStack = createStackNavigator();

export default function WalletStackScreen() {
    return (
        <WalletStack.Navigator
            screenOptions={({ navigation }) => ({
                ...stackConfig,
                headerTitleStyle: { alignSelf: 'center', color: themeStyles.fontColorMain.color, marginRight: Platform.OS === 'ios' ? 0 : 50 },
                headerStyle: {
                    backgroundColor: themeStyles.containerColorMain.backgroundColor,
                    shadowOpacity: 0,
                    elevation: 0
                },
                headerTitle: ' ',
                headerBackTitle: ' ',
                headerLeft: () => <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={1}>
                    <Ionicons name="chevron-back" size={32} color="#007ef5" />
                </TouchableOpacity>
            })}
        >
            <WalletStack.Screen
                options={({ navigation }) => ({
                    headerLeft: () => <LogoHeaderComponent></LogoHeaderComponent>,
                    headerRight: () => <TouchableOpacity
                        style={{ marginRight: 5 }}
                        onPress={() => navigation.push('TransactionsHistory')} activeOpacity={0.7}>
                        <FontAwesome5 name="history" size={20} color={themeStyles.fontColorMain.color} />
                    </TouchableOpacity>
                })}
                name="Wallet"
                component={WalletScreen}
            />
            {
                SharedStackScreens.map((item: any, index: number) => <WalletStack.Screen
                    key={`${item.name as string}_${index}`}
                    options={item.options}
                    name={item.name}
                    component={item.component}
                />
                )
            }

        </WalletStack.Navigator>
    );
}
