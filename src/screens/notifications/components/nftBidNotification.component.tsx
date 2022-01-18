import { themeStyles } from '@styles/globalColors';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Profile, Notification } from '@types';
import { globalStyles } from '@styles/globalStyles';
import { calculateAndFormatDeSoInUsd } from '@services/deSoCalculator';
import ProfileInfoImageComponent from '@components/profileInfo/profileInfoImage.component';
import ProfileInfoUsernameComponent from '@components/profileInfo/profileInfoUsername.component';
import { notificationsStyles } from '../styles/notificationStyles';
import { StackNavigationProp } from '@react-navigation/stack';
import { ParamListBase } from '@react-navigation/native';

interface Props {
    profile: Profile;
    goToPost: (p_postHashHex: string, p_priorityComment: undefined) => void;
    notification: Notification;
    navigation: StackNavigationProp<ParamListBase>;
    postHashHex: string;
}

export class NftBidNotificationComponent extends React.Component<Props> {
    constructor(props: Props) {
        super(props);
    }

    shouldComponentUpdate(p_nextProps: Props) {
        return p_nextProps.notification?.Index !== this.props.notification?.Index;
    }

    render() {
        const output = this.props.notification.Metadata.NFTBidTxindexMetadata?.BidAmountNanos;
        const isBidCancelled = this.props.notification.Metadata.NFTBidTxindexMetadata?.BidAmountNanos === 0;
        let deSoAmount = '';
        let usdAmount = '';

        if (output) {
            deSoAmount = (output / 1000000000).toFixed(3);
            usdAmount = calculateAndFormatDeSoInUsd(output);
        }

        return (
            <TouchableOpacity
                style={[notificationsStyles.notificationContainer, notificationsStyles.centerTextVertically, themeStyles.containerColorMain, themeStyles.borderColor]}
                onPress={() => this.props.goToPost(this.props.postHashHex, undefined)}
                activeOpacity={1}>
                <ProfileInfoImageComponent
                    navigation={this.props.navigation}
                    profile={this.props.profile}
                />
                <View style={[notificationsStyles.iconContainer, { backgroundColor: isBidCancelled ? '#FE3537' : '#00803c' }]}>
                    <FontAwesome style={[{ marginLeft: 1 }]} name="dollar" size={14} color="white" />
                </View>

                <View style={notificationsStyles.textContainer}>
                    <ProfileInfoUsernameComponent
                        navigation={this.props.navigation}
                        profile={this.props.profile}
                    />
                    <Text style={[globalStyles.fontWeight500, themeStyles.fontColorMain]}> {
                        isBidCancelled ? 'cancelled their bid on' : 'bid'}</Text>
                    {
                        !isBidCancelled &&
                        <>
                            <Text style={[notificationsStyles.usernameText, themeStyles.fontColorMain]}> {deSoAmount} DESO</Text>
                            <Text style={[notificationsStyles.usernameText, themeStyles.fontColorMain]}> (~${usdAmount}) for</Text>
                        </>
                    }
                    <Text style={[globalStyles.fontWeight500, themeStyles.fontColorMain]}> serial number</Text>
                    <Text style={[notificationsStyles.usernameText, themeStyles.fontColorMain]}> {
                        this.props.notification.Metadata.NFTBidTxindexMetadata?.SerialNumber
                    }
                    </Text>
                </View>
            </TouchableOpacity>
        );
    }
}
