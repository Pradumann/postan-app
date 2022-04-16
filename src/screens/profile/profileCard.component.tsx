import React from 'react';
import { View, StyleSheet, Image, Text, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialIcons, AntDesign } from '@expo/vector-icons';
import { ParamListBase } from '@react-navigation/native';
import { TextWithLinks } from '@components/textWithLinks.component';
import { api, cache, formatNumber, calculateDeSoInUSD } from '@services';
import { eventManager, globals, settingsGlobals } from '@globals';
import { ChangeFollowersEvent, EventType, Profile, User } from '@types';
import { themeStyles } from '@styles';
import { StackNavigationProp } from '@react-navigation/stack';
import TitleText from '../../common/texts/TitleText';
import RegularText from 'src/common/texts/RegularText';

interface Props {
    navigation: StackNavigationProp<ParamListBase>;
    profile: Profile;
    coinPrice: number;
}

interface State {
    doUserHODL: boolean;
    followersNumber: number | undefined;
    followingNumber: number | undefined;
    founderReward: string;
    formattedCoinPrice: string;
    diamondsEarned: number | undefined;
    usdToRupeesValue: number;
}

export class ProfileCard extends React.Component<Props, State> {

    private _isMounted = false;

    private _unsubscribes: (() => void)[] = [];

    constructor(props: Props) {
        super(props);

        const founderReward = this.props.profile.CoinEntry.CreatorBasisPoints / 100;
        let formattedFounderReward;
        if (Number.isInteger(founderReward)) {
            formattedFounderReward = founderReward.toString();
        } else {
            formattedFounderReward = founderReward.toFixed(1);
        }

        const formattedCoinPrice = formatNumber(this.props.coinPrice);

        this.state = {
            doUserHODL: false,
            followingNumber: undefined,
            followersNumber: undefined,
            founderReward: formattedFounderReward,
            formattedCoinPrice: formattedCoinPrice,
            diamondsEarned: undefined,
            usdToRupeesValue: 75

        };

        fetch('https://open.er-api.com/v6/latest/USD')
        .then((response) => response.json())
        .then((json) => {
            console.log("Json, + " , json.rates.INR)
            this.setState({
                usdToRupeesValue: json.rates.INR
            })
        })
        .catch((error) => {
          console.error(error);
           
        });

        const unsubscribeIncreaseFollowers = eventManager.addEventListener(
            EventType.IncreaseFollowers,
            (event: ChangeFollowersEvent) => {
                if (event.publicKey === this.props.profile.PublicKeyBase58Check) {
                    if (this._isMounted) {
                        this.setState(
                            previousState => (
                                {
                                    followersNumber: (previousState.followersNumber ?? 0) + 1
                                }
                            )
                        );
                    }
                }
            }
        );

        const unsubscribeDecreaseFollowers = eventManager.addEventListener(
            EventType.DecreaseFollowers,
            (event: ChangeFollowersEvent) => {
                if (event.publicKey === this.props.profile.PublicKeyBase58Check) {
                    if (this._isMounted) {
                        this.setState(
                            previousState => (
                                {
                                    followersNumber: (previousState.followersNumber ?? 1) - 1
                                }
                            )
                        );
                    }
                }
            }
        );

        this.goToFollowersScreen = this.goToFollowersScreen.bind(this);

        this._unsubscribes.push(unsubscribeIncreaseFollowers, unsubscribeDecreaseFollowers);

        this.loadFollowers();
        this.diamondsEarning();
    }

    componentDidMount(): void {
        this._isMounted = true;
    }

    componentWillUnmount(): void {
        this._isMounted = false;
        for (const unsubscribe of this._unsubscribes) {
            unsubscribe();
        }
    }

    private async loadFollowers(): Promise<void> {
        const requests = [
            api.getProfileFollowers('', this.props.profile.Username, '', 0),
            api.getProfileFollowing('', this.props.profile.Username, '', 0)
        ];

        if (this.props.profile.PublicKeyBase58Check !== globals.user.publicKey) {
            requests.push(cache.user.getData());
        }

        await Promise.all(requests).then(
            responses => {

                let doUserHODL = false;

                if (responses.length === 3) {
                    const user: User = responses[2];
                    const userHODLs = user.UsersWhoHODLYou?.find(user => user.HODLerPublicKeyBase58Check === this.props.profile.PublicKeyBase58Check);
                    doUserHODL = !!userHODLs && userHODLs.HasPurchased;
                }

                if (this._isMounted) {
                    this.setState(
                        {
                            followersNumber: responses[0].NumFollowers,
                            followingNumber: responses[1].NumFollowers,
                            doUserHODL: doUserHODL
                        }
                    );
                }
            }
        ).catch(
            response => globals.defaultHandleError(response)
        );
    }

    private goToFollowersScreen(selectedTab: string): void {
        if (this.props.profile.Username !== 'anonymous') {
            eventManager.dispatchEvent(EventType.ToggleProfileInfoModal, { visible: false });
            this.props.navigation.push(
                'ProfileFollowersTab',
                {
                    publicKey: this.props.profile.PublicKeyBase58Check,
                    username: this.props.profile.Username,
                    selectedTab: selectedTab,
                    followersNumber: this.state.followersNumber,
                    followingNumber: this.state.followingNumber
                }
            );
        }
    }

    private async diamondsEarning(): Promise<void>{
        await api.getProfileDiamonds(this.props.profile.PublicKeyBase58Check)
        .then(data => {
            let totaldiamondvalue = 0;
                
            const calculateDiamondsWorth = (count: number): number => {
                const nanos = 5000 * Math.pow(10, count);
                console.log('earned count = *****', count)
                console.log('earned nanose = ', nanos)
                return calculateDeSoInUSD(nanos, this.state.usdToRupeesValue);
            };

            let totaldiamondlevelmap = {'1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0};
            
            for (let profile of data['DiamondSenderSummaryResponses']) {
                let diamondlevelmap = profile['DiamondLevelMap'];

                totaldiamondlevelmap['1'] += (diamondlevelmap['1'] ?? 0);
                totaldiamondlevelmap['2'] += (diamondlevelmap['2'] ?? 0);
                totaldiamondlevelmap['3'] += (diamondlevelmap['3'] ?? 0);
                totaldiamondlevelmap['4'] += (diamondlevelmap['4'] ?? 0);
                totaldiamondlevelmap['5'] += (diamondlevelmap['5'] ?? 0);
                totaldiamondlevelmap['6'] += (diamondlevelmap['6'] ?? 0);
            }

                totaldiamondvalue += totaldiamondlevelmap['1'] * calculateDiamondsWorth(1) + totaldiamondlevelmap['2'] * calculateDiamondsWorth(2) + totaldiamondlevelmap['3'] * calculateDiamondsWorth(3) + totaldiamondlevelmap['4'] * calculateDiamondsWorth(4) + totaldiamondlevelmap['5'] * calculateDiamondsWorth(5) + totaldiamondlevelmap['6'] * calculateDiamondsWorth(6);
                console.log('earned = 1',  totaldiamondlevelmap['1'])
                console.log('earned = 2',  totaldiamondlevelmap['2'])
                console.log('earned = 3',  totaldiamondlevelmap['3'])
                console.log('earned = 4',  totaldiamondlevelmap['4'])
                console.log('earned = 5',  totaldiamondlevelmap['5'])
                console.log('earned = 6',  totaldiamondlevelmap['6'])


                console.log('earned = 1 --',   calculateDiamondsWorth(1) )
                console.log('earned = 2 --', calculateDiamondsWorth(2) )
                console.log('earned = 3 --',  calculateDiamondsWorth(3) )
                console.log('earned = 4 --',  calculateDiamondsWorth(4) )
                console.log('earned = 5 --', calculateDiamondsWorth(5) )
                console.log('earned = 6 --',  calculateDiamondsWorth(6) )


                
                console.log('earned = ', totaldiamondvalue)

                if (this._isMounted) {
                    this.setState(
                        {
                            diamondsEarned: totaldiamondvalue
                        }
                    );
                }

            })
            .catch(response => globals.defaultHandleError(response)) ;
    }

    render(): JSX.Element {
        return <View
            style={
                [
                    styles.container,
                    themeStyles.containerColorMain,
                    themeStyles.shadowColor
                ]
            }
        >

            <Image style={styles.profilePic} source={{ uri: this.props.profile.ProfilePic }} />

            <View style={styles.usernameContainer}>
                <TitleText 
                    style={{marginBottom: 6}}
                    value={this.props.profile.Username}
                />
{/* 
                <Text style={[styles.username, themeStyles.fontColorMain]} selectable={true}>{this.props.profile.Username}</Text> */}

                {
                    this.props.profile.IsVerified &&
                    <MaterialIcons style={styles.verifiedIcon} name="verified" size={16} color="#007ef5" />
                }
            </View>

            <View style={styles.description}>
                {/* <TouchableOpacity>
                    <RegularText 
                        value={this.props.profile.Description}
                        style={{ maxWidth: Dimensions.get('window').width * 0.7}}
                    />
                </TouchableOpacity> */}
                 <TextWithLinks
                    navigation={this.props.navigation}
                    isProfile
                    numberOfLines={5}
                    style={[styles.description, themeStyles.fontColorSub]}
                    text={this.props.profile.Description}
                /> 
            </View>
            <View style={styles.infoContainer}>
                <View style={styles.infoTextContainer}>
                    <TouchableOpacity
                        style={styles.infoButton}
                        activeOpacity={1}
                        disabled={this.state.followersNumber != null ? false : true}
                        onPress={() => this.goToFollowersScreen('Followers')}>
                        <Text style={[styles.infoTextLabel, themeStyles.fontColorSub]}>Followers</Text>
                        {
                            this.state.followersNumber != null ?
                                < Text style={[styles.infoTextNumber, themeStyles.fontColorMain]}>{formatNumber(this.state.followersNumber, false)}</Text>
                                :
                                <ActivityIndicator color={themeStyles.fontColorMain.color} style={styles.activityIndicator} />
                        }
                    </TouchableOpacity>
                </View>

                <View style={styles.infoBorder} />

                <View style={styles.infoTextContainer}>
                    <TouchableOpacity
                        style={styles.infoButton}
                        activeOpacity={1}
                        disabled={this.state.followingNumber != null ? false : true}
                        onPress={() => this.goToFollowersScreen('Following')}>
                        <Text style={[styles.infoTextLabel, themeStyles.fontColorSub]}>Following</Text>
                        {
                            this.state.followingNumber != null ?
                                <Text style={[styles.infoTextNumber, themeStyles.fontColorMain]}>{formatNumber(this.state.followingNumber, false)}</Text>
                                : <ActivityIndicator color={themeStyles.fontColorMain.color} style={styles.activityIndicator} />
                        }
                    </TouchableOpacity>
                </View>

                <View style={styles.infoBorder} />

                <View style={styles.infoTextContainer}>
                    <TouchableOpacity
                        style={styles.infoButton}
                        activeOpacity={1}
                        onPress={() => {}}>
                        <Text style={[styles.infoTextLabel, themeStyles.fontColorSub]}>Earned</Text>
                        {
                            this.state.diamondsEarned != null ?
                                <Text style={[styles.infoTextNumber, themeStyles.fontColorMain]}>₹{formatNumber(this.state.diamondsEarned, false)}</Text>
                                : <ActivityIndicator color={themeStyles.fontColorMain.color} style={styles.activityIndicator} />
                        }
                    </TouchableOpacity>
                </View>

            </View>
        </View>;
    }
}

const styles = StyleSheet.create(
    {
        container: {
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 5,
            paddingHorizontal: 10,
            borderRadius: 8,
            shadowOffset: {
                width: 0,
                height: 0,
            },
            shadowOpacity: 1,
            shadowRadius: 1,
            elevation: 1,
        },
        profilePic: {
            marginBottom: 16,
            width: 60,
            height: 60,
            borderRadius: 8
        },
        usernameContainer: {
            flexDirection: 'row',
            alignItems: 'center'
        },
        username: {
            fontWeight: 'bold',
            marginBottom: 6,
            fontSize: 20,
            marginRight: 6
        },
        description: {
            maxWidth: Dimensions.get('window').width * 0.7,
            fontSize: 12
        },
        infoContainer: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-around',
            alignSelf: 'stretch',
            marginVertical: 12,
        },
        infoTextContainer: {
            paddingVertical: 16,
            flex: 1,
            alignItems: 'center',
        },
        infoButton: {
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
        },
        infoTextNumber: {
            fontSize: 20,
            fontWeight: 'bold'
        },
        infoTextLabel: {
            fontSize: 12,
            marginBottom: 4
        },
        infoBorder: {
            height: 40,
            width: 1,
            backgroundColor: settingsGlobals.darkMode ? '#3b3b3b' : '#e0e0e0'
        },
        foundRewardContainer: {
            paddingVertical: 5,
            paddingHorizontal: 6,
            borderRadius: 4,
            marginLeft: 6
        },
        founderRewardText: {
            fontSize: 10,
            fontWeight: '700'
        },
        percentage: {
            fontSize: 9
        },
        verifiedIcon: {
            marginBottom: 2
        },
        activityIndicator: {
            marginTop: 4
        },
        headerContainer: {
            width: Dimensions.get('window').width,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 12,
        },
        bitBadgesLogo: {
            width: 14,
            height: 14,
        },
        bitBadgesContainer: {
            paddingVertical: 5,
            paddingHorizontal: 6,
            borderRadius: 4,
        },
        bitBadgesButton: {
            paddingVertical: 5,
            paddingHorizontal: 6,
            borderRadius: 4,
            flexDirection: 'row',
            justifyContent: 'center',
            alignContent: 'center',
            alignItems: 'center',
        },
    }
);
