import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { CreatorCoinTransaction, Profile } from '@types';
import { themeStyles } from '@styles/globalColors';
import { calculateDurationUntilNow, formatNumber, getAnonymousProfile } from '@services/helpers';
import { FontAwesome5 } from '@expo/vector-icons';
import { ParamListBase } from '@react-navigation/native';
import ProfileInfoCardComponent from '@components/profileInfo/profileInfoCard.component';
import { StackNavigationProp } from '@react-navigation/stack';

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    creatorCoinTransaction: CreatorCoinTransaction;
    publicKey: string;
    profile: Profile | null;
}

export class CreatorCoinTransactionComponent extends React.Component<Props> {

    constructor(props: Props) {
        super(props);
    }

    shouldComponentUpdate(p_nextProps: Props) {
        return p_nextProps.publicKey !== this.props.publicKey ||
            (p_nextProps.profile != null) !== (this.props.profile != null);
    }

    private goToProfile(p_profile: Profile) {
        if (p_profile.Username !== 'anonymous') {
            (this.props.navigation as any).push('UserProfile', {
                publicKey: p_profile.PublicKeyBase58Check,
                username: p_profile.Username,
                key: 'Profile_' + p_profile.PublicKeyBase58Check
            });
        }
    }

    render() {

        const profile = this.props.profile ?? getAnonymousProfile(this.props.publicKey);

        return <TouchableOpacity onPress={() => this.goToProfile(profile)} activeOpacity={1}>
            <View style={[styles.profileListCard, themeStyles.containerColorMain, themeStyles.borderColor]}>
                <ProfileInfoCardComponent
                    profile={this.props.profile as Profile}
                    navigation={this.props.navigation}
                    duration={calculateDurationUntilNow(this.props.creatorCoinTransaction.timeStamp * 1000000000)}
                />

                {
                    this.props.creatorCoinTransaction.bitcloutValue > 0
                        ? <FontAwesome5 style={styles.circleIcon} name="arrow-circle-up" size={24} color="#30c296" />
                        : <FontAwesome5 style={styles.circleIcon} name="arrow-circle-down" size={24} color="#e24c4f" />
                }

                <View style={styles.transactionAmountContainer}>
                    <Text style={[styles.transactionAmountCoins, themeStyles.fontColorMain]}>{Math.abs(this.props.creatorCoinTransaction.coinsChange).toFixed(4)}</Text>
                    <Text style={[styles.transactionAmountUSD, themeStyles.fontColorMain]}>~₹{formatNumber(Math.abs(this.props.creatorCoinTransaction.usdValue))}</Text>
                </View>
            </View>
        </TouchableOpacity>;
    }
}

const styles = StyleSheet.create(
    {
        profileListCard: {
            flexDirection: 'row',
            paddingVertical: 16,
            paddingHorizontal: 10,
            borderBottomWidth: 1,
            alignItems: 'center'
        },
        circleIcon: {
            marginLeft: 'auto',
            marginRight: 10
        },
        transactionAmountContainer: {
            justifyContent: 'center',
            minWidth: 55
        },
        transactionAmountCoins: {
            fontWeight: '600',
            fontSize: 16
        },
        transactionAmountUSD: {
            fontSize: 10
        },
    }
);
