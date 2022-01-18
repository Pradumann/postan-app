import { themeStyles } from '@styles/globalColors';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { calculateDeSoInUSD } from '@services';
import { Profile, Notification } from '@types';
import { globalStyles } from '@styles/globalStyles';
import { FontAwesome } from '@expo/vector-icons';
import ProfileInfoImageComponent from '@components/profileInfo/profileInfoImage.component';
import ProfileInfoUsernameComponent from '@components/profileInfo/profileInfoUsername.component';
import { notificationsStyles } from '../styles/notificationStyles';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/native';

interface Props {
    profile: Profile;
    goToProfile: (p_userKey: string, p_username: string) => void;
    notification: Notification;
    navigation: StackNavigationProp<ParamListBase>;
}

export class CreatorCoinNotificationComponent extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    shouldComponentUpdate(p_nextProps: Props) {
        return p_nextProps.notification?.Index !== this.props.notification?.Index;
    }

    render() {
        const deSo = this.props.notification.Metadata.CreatorCoinTxindexMetadata?.DeSoToSellNanos as number;
        const usd = calculateDeSoInUSD(deSo);
        return (
            <TouchableOpacity
                style={[notificationsStyles.notificationContainer, notificationsStyles.centerTextVertically, themeStyles.containerColorMain, themeStyles.borderColor]}
                onPress={() => this.props.goToProfile(this.props.profile?.PublicKeyBase58Check, this.props.profile?.Username)}
                activeOpacity={1}>

                <ProfileInfoImageComponent
                    navigation={this.props.navigation}
                    profile={this.props.profile}
                />
                <View style={[notificationsStyles.iconContainer, { backgroundColor: '#00803c' }]}>
                    <FontAwesome style={[{ marginLeft: 1 }]} name="dollar" size={14} color="white" />
                </View>

                <View style={notificationsStyles.textContainer}>
                    <ProfileInfoUsernameComponent
                        navigation={this.props.navigation}
                        profile={this.props.profile}
                    />
                    <Text style={[globalStyles.fontWeight500, themeStyles.fontColorMain]}> bought </Text>
                    <Text style={[notificationsStyles.usernameText, themeStyles.fontColorMain]}>~₹{usd} </Text>
                    <Text style={[globalStyles.fontWeight500, themeStyles.fontColorMain]}>worth of your coin</Text>
                </View>
            </TouchableOpacity>
        );
    }
}
