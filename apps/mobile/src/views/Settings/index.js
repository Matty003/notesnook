import React, {createRef, useCallback, useEffect, useState} from 'react';
import {
  Appearance,
  InteractionManager,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import {enabled} from 'react-native-privacy-snapshot';
import Menu, {MenuItem} from 'react-native-reanimated-material-menu';
import AnimatedProgress from 'react-native-reanimated-progress-bar';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {Button} from '../../components/Button';
import BaseDialog from '../../components/Dialog/base-dialog';
import DialogButtons from '../../components/Dialog/dialog-buttons';
import DialogContainer from '../../components/Dialog/dialog-container';
import DialogHeader from '../../components/Dialog/dialog-header';
import Input from '../../components/Input';
import {PressableButton} from '../../components/PressableButton';
import Seperator from '../../components/Seperator';
import {Header} from '../../components/SimpleList/header';
import {Toast} from '../../components/Toast';
import Heading from '../../components/Typography/Heading';
import Paragraph from '../../components/Typography/Paragraph';
import {useTracked} from '../../provider';
import {Actions} from '../../provider/Actions';
import Backup from '../../services/Backup';
import BiometricService from '../../services/BiometricService';
import {DDS} from '../../services/DeviceDetection';
import {
  eSendEvent,
  eSubscribeEvent,
  eUnSubscribeEvent,
  openVault,
  ToastEvent,
} from '../../services/EventManager';
import Navigation from '../../services/Navigation';
import PremiumService from '../../services/PremiumService';
import SettingsService from '../../services/SettingsService';
import {
  AndroidModule,
  APP_VERSION,
  dWidth,
  MenuItemsList,
  setSetting,
  SUBSCRIPTION_PROVIDER,
  SUBSCRIPTION_STATUS_STRINGS,
} from '../../utils';
import {
  ACCENT,
  COLOR_SCHEME,
  COLOR_SCHEME_DARK,
  COLOR_SCHEME_LIGHT,
  setColorScheme,
} from '../../utils/Colors';
import {hexToRGBA, RGB_Linear_Shade} from '../../utils/ColorUtils';
import {db} from '../../utils/DB';
import {
  eOpenLoginDialog,
  eOpenPremiumDialog,
  eOpenProgressDialog,
  eOpenRecoveryKeyDialog,
  eOpenRestoreDialog,
  eScrollEvent,
  eUpdateSearchState,
} from '../../utils/Events';
import {openLinkInBrowser} from '../../utils/functions';
import {MMKV} from '../../utils/mmkv';
import {pv, SIZE} from '../../utils/SizeUtils';
import Storage from '../../utils/storage';
import {sleep, timeConverter} from '../../utils/TimeUtils';

let menuRef = createRef();

const format = (ver) => {
  let parts = ver.toString().split('');
  return `v${parts[0]}.${parts[1]}.${parts[2]}${
    parts[3] === '0' ? '' : parts[3]
  } `;
};

export const Settings = ({navigation}) => {
  const [state, dispatch] = useTracked();
  const {colors} = state;
  const [version, setVersion] = useState(null);

  let pageIsLoaded = false;

  const onFocus = useCallback(() => {
    eSendEvent(eScrollEvent, {name: 'Settings', type: 'in'});
    if (DDS.isLargeTablet()) {
      dispatch({
        type: Actions.CONTAINER_BOTTOM_BUTTON,
        state: {
          onPress: null,
        },
      });
    }

    eSendEvent(eUpdateSearchState, {
      placeholder: '',
      data: [],
      noSearch: true,
      type: '',
      color: null,
    });

    if (!pageIsLoaded) {
      pageIsLoaded = true;
      return;
    }
    Navigation.setHeaderState(
      'Settings',
      {
        menu: true,
      },
      {
        heading: 'Settings',
        id: 'settings_navigation',
      },
    );
  }, []);

  useEffect(() => {
    navigation.addListener('focus', onFocus);
    db.version()
      .then((ver) => {
        console.log(ver, 'VERSION');
        setVersion(ver);
      })
      .catch((e) => console.log(e, 'VER'));

    return () => {
      pageIsLoaded = false;
      eSendEvent(eScrollEvent, {name: 'Settings', type: 'back'});
      navigation.removeListener('focus', onFocus);
    };
  }, []);

  const otherItems = [
    {
      name: 'Terms of service',
      func: async () => {
        try {
          await openLinkInBrowser('https://notesnook.com/tos', colors);
        } catch (e) {}
      },
      desc: 'Read our terms of service',
    },

    {
      name: 'Privacy policy',
      func: async () => {
        try {
          await openLinkInBrowser('https://notesnook.com/privacy', colors);
        } catch (e) {}
      },
      desc: 'Read our privacy policy',
    },
    {
      name: 'Check for updates',
      func: async () => {
        if (!version) return;
        if (version.mobile <= APP_VERSION) {
          ToastEvent.show({
            heading: 'No new updates',
            type: 'success',
            message: 'You are using the latest version',
          });
          return;
        }
        eSendEvent('updateDialog', version);
      },

      desc:
        version?.mobile > APP_VERSION
          ? 'New update available.'
          : 'You are using the latest version',
    },
    {
      name: 'Join our Discord community',

      func: async () => {
        eSendEvent(eOpenProgressDialog, {
          title: 'Join our Discord Community',
          paragraph:
            'We are not ghosts, chat with us and share your experience.',
          valueArray: [
            'Talk with us anytime.',
            'Follow the development process',
            'Give suggestions and report issues.',
            'Get early access to new features',
            'Meet other people using Notesnook',
          ],
          noProgress: true,
          icon: 'discord',
          action: async () => {
            try {
              await openLinkInBrowser('https://discord.gg/zQBK97EE22', colors);
            } catch (e) {}
          },
          actionText: 'Join Now',
        });
      },
      desc: 'We are not ghosts, chat with us and share your experience.',
    },
    {
      name: 'About Notesnook',
      func: async () => {
        try {
          await openLinkInBrowser('https://notesnook.com', colors);
        } catch (e) {}
      },
      desc: format(APP_VERSION),
    },
  ];

  return (
    <View
      style={{
        height: '100%',
        backgroundColor: colors.bg,
      }}>
      <ScrollView
        onScroll={(e) =>
          eSendEvent(eScrollEvent, e.nativeEvent.contentOffset.y)
        }
        scrollEventThrottle={1}
        style={{
          paddingHorizontal: 0,
        }}>
        {!DDS.isLargeTablet() && (
          <Header title="Settings" type="settings" messageCard={false} />
        )}
        <SettingsUserSection />
        <SettingsAppearanceSection />
        <SettingsPrivacyAndSecurity />
        <SettingsBackupAndRestore />

        <SectionHeader title="Other" />

        {otherItems.map((item) => (
          <CustomButton
            key={item.name}
            title={item.name}
            tagline={item.desc}
            onPress={item.func}
          />
        ))}

        <AccoutLogoutSection />

        <View
          style={{
            height: 400,
          }}
        />
      </ScrollView>
    </View>
  );
};

export default Settings;

const SectionHeader = ({title}) => {
  const [state] = useTracked();
  const {colors} = state;

  return (
    <Heading
      size={SIZE.sm}
      color={colors.accent}
      style={{
        textAlignVertical: 'center',
        paddingHorizontal: 12,
        height: 30,
        backgroundColor: colors.nav,
      }}>
      {title}
    </Heading>
  );
};

let passwordValue = null;
const AccoutLogoutSection = () => {
  const [state, dispatch] = useTracked();
  const {colors, user} = state;
  const [visible, setVisible] = useState(false);
  const [deleteAccount, setDeleteAccount] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    user && (
      <>
        {loading && (
          <BaseDialog visible={true}>
            <View
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: colors.bg,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Heading color={colors.pri} size={SIZE.md}>
                Logging out
              </Heading>
              <View
                style={{
                  flexDirection: 'row',
                  height: 10,
                  width: 100,
                  marginTop: 15,
                }}>
                <AnimatedProgress fill={colors.accent} total={8} current={8} />
              </View>
            </View>
          </BaseDialog>
        )}

        {visible && (
          <BaseDialog visible={true}>
            <DialogContainer>
              <DialogHeader
                title="Logout"
                paragraph="Clear all your data and reset the app."
              />
              <DialogButtons
                positiveTitle="Logout"
                negativeTitle="Cancel"
                onPressNegative={() => setVisible(false)}
                onPressPositive={async () => {
                  setVisible(false);
                  setLoading(true);
                  await sleep(10);
                  await db.user.logout();
                  await sleep(10);
                  setLoading(false);
                }}
              />
            </DialogContainer>
          </BaseDialog>
        )}

        {deleteAccount && (
          <BaseDialog
            onRequestClose={() => {
              setDeleteAccount(false);
              passwordValue = null;
            }}
            visible={true}>
            <DialogContainer>
              <DialogHeader
                title="Delete Account"
                paragraph="All your data will be removed permanantly. This action is IRREVERSIBLE."
                paragraphColor={colors.red}
              />

              <Input
                placeholder="Enter account password"
                onChangeText={(v) => {
                  passwordValue = v;
                }}
                secureTextEntry={true}
              />

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  alignSelf: 'flex-end',
                }}>
                <Button
                  onPress={() => {
                    setDeleteAccount(false);
                    passwordValue = null;
                  }}
                  fontSize={SIZE.md}
                  type="gray"
                  title="Cancel"
                />
                <Button
                  onPress={async () => {
                    if (!passwordValue) {
                      ToastEvent.show({
                        heading: 'Account Password is required',
                        type: 'error',
                        context: 'local',
                      });
                      return;
                    }
                    try {
                      await db.user.deleteUser(passwordValue);
                    } catch (e) {
                      ToastEvent.show({
                        heading: 'Failed to delete account',
                        message: e.message,
                        type: 'error',
                        context: 'local',
                      });
                    }
                    close();
                  }}
                  fontSize={SIZE.md}
                  style={{
                    marginLeft: 10,
                  }}
                  type="accent"
                  accentColor="light"
                  accentText="red"
                  title="Delete"
                />
              </View>
            </DialogContainer>
            <Toast context="local" />
          </BaseDialog>
        )}

        {[
          {
            name: 'Logout',
            func: async () => {
              setVisible(true);
            },
          },
          {
            name: 'Delete My Account',
            func: () => {
              setDeleteAccount(true);
              passwordValue = null;
            },
          },
        ].map((item, index) => (
          <PressableButton
            onPress={item.func}
            key={item.name}
            type="gray"
            customStyle={{
              height: 50,
              borderTopWidth: index === 0 ? 1 : 0,
              borderTopColor: colors.nav,
              width: '100%',
              alignItems: 'flex-start',
              paddingHorizontal: 12,
              marginTop: index === 0 ? 25 : 0,
              borderRadius: 0,
            }}>
            <Heading
              color={item.name === 'Logout' ? colors.pri : colors.red}
              style={{
                fontSize: SIZE.md,
              }}>
              {item.name}
            </Heading>
          </PressableButton>
        ))}
      </>
    )
  );
};

const CustomButton = ({
  title,
  tagline,
  customComponent,
  onPress,
  maxWidth = '100%',
  color = null,
}) => {
  const [state] = useTracked();
  const {colors} = state;
  return (
    <PressableButton
      onPress={onPress}
      customStyle={{
        minHeight: 50,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        width: '100%',
        borderRadius: 0,
        flexDirection: 'row',
      }}>
      <View
        style={{
          maxWidth: maxWidth,
        }}>
        <Paragraph
          size={SIZE.md}
          color={color || colors.pri}
          style={{
            textAlignVertical: 'center',
          }}>
          {title}
        </Paragraph>
        <Paragraph size={SIZE.sm} color={colors.icon}>
          {tagline}
        </Paragraph>
      </View>
      {customComponent ? customComponent : null}
    </PressableButton>
  );
};

const SettingsUserSection = () => {
  const [state] = useTracked();
  const {colors, user, messageBoardState} = state;

  /*  const user = {
    email: 'ammarahmed6506@gmail.com',
    subscription: {
      provider: 1,
      expiry: Date.now() + 86400000 * 2,
      type: 5,
    },
  }; */
  const getTimeLeft = (t2) => {
    let d1 = new Date(Date.now());
    let d2 = new Date(t2);
    let diff = d2.getTime() - d1.getTime();
    diff = (diff / (1000 * 3600 * 24)).toFixed(0);

    return diff < 0 ? 0 : diff;
  };

  return (
    <>
      {messageBoardState && messageBoardState?.visible && (
        <PressableButton
          onPress={messageBoardState.onPress}
          customStyle={{
            paddingVertical: 12,
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingHorizontal: 0,
          }}>
          <View
            style={{
              width: 40,
              backgroundColor:
                messageBoardState.type === 'error' ? colors.red : colors.accent,
              height: 40,
              marginLeft: 10,
              borderRadius: 100,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon size={SIZE.lg} color="white" name={messageBoardState.icon} />
          </View>

          <View
            style={{
              marginLeft: 10,
            }}>
            <Paragraph color={colors.icon} size={SIZE.xs}>
              {messageBoardState.message}
            </Paragraph>
            <Paragraph
              color={
                messageBoardState.type === 'error' ? colors.red : colors.accent
              }>
              {messageBoardState.actionText}
            </Paragraph>
          </View>

          <View
            style={{
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              position: 'absolute',
              right: 6,
            }}>
            <Icon
              name="chevron-right"
              color={
                messageBoardState.type === 'error' ? colors.red : colors.accent
              }
              size={SIZE.lg}
            />
          </View>
        </PressableButton>
      )}

      {user ? (
        <>
          <View
            style={{
              paddingHorizontal: 12,
              marginTop: 15,
              marginBottom: 15,
            }}>
            <View
              style={{
                alignSelf: 'center',
                width: '100%',
                paddingVertical: 12,
                backgroundColor: colors.bg,
                borderRadius: 5,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: colors.accent,
              }}>
              <View
                style={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexDirection: 'row',
                  paddingBottom: 2.5,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderRadius: 100,
                      borderColor: colors.accent,
                      width: 20,
                      height: 20,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Icon
                      size={SIZE.md}
                      color={colors.accent}
                      name="account-outline"
                    />
                  </View>

                  <Paragraph
                    color={colors.heading}
                    size={SIZE.sm}
                    style={{
                      marginLeft: 5,
                    }}>
                    {user?.email}
                  </Paragraph>
                </View>
                <View
                  style={{
                    borderRadius: 5,
                    padding: 5,
                    paddingVertical: 2.5,
                  }}>
                  <Heading color={colors.accent} size={SIZE.sm}>
                    {SUBSCRIPTION_STATUS_STRINGS[user.subscription.type]}
                  </Heading>
                </View>
              </View>
              <View>
                {user.subscription.type === 1 ||
                user.subscription.type === 2 ||
                user.subscription.type === 5 ||
                user.subscription.type === 6 ||
                user.subscription.type === 7 ? (
                  <View>
                    <Seperator />
                    <Paragraph
                      size={SIZE.lg}
                      color={
                        getTimeLeft(parseInt(user.subscription.expiry)) > 5 ||
                        user.subscription.type !== 6
                          ? colors.accent
                          : colors.red
                      }>
                      {getTimeLeft(parseInt(user.subscription.expiry)) +
                        ' Days Remaining'}{' '}
                    </Paragraph>
                    <Paragraph color={colors.pri}>
                      {user.subscription.type === 2
                        ? 'You signed up for our Beta Program on ' +
                          timeConverter(user.subscription.start)
                        : user.subscription.type === 1
                        ? 'Your trial period started on ' +
                          timeConverter(user.subscription.start)
                        : user.subscription.type === 6
                        ? 'Your account will be downgraded to Basic in 3 days.'
                        : user.subscription.type === 7
                        ? 'You have cancelled your subscription.'
                        : user.subscription.type === 5
                        ? 'Your subscription will auto renew every month.'
                        : null}
                    </Paragraph>
                  </View>
                ) : null}

                {!user.isEmailConfirmed &&
                  user.subscription.type !== 5 &&
                  user.subscription.type !== 2 && (
                    <>
                      <Seperator />
                      <Button
                        onPress={() => {
                          eSendEvent(eOpenPremiumDialog);
                        }}
                        width="100%"
                        fontSize={SIZE.md}
                        title={
                          user.subscription.type === 6
                            ? 'Resubscribe to Notesnook Pro'
                            : 'Subscribe to Notesnook Pro'
                        }
                        height={50}
                        type="transparent"
                      />
                    </>
                  )}
              </View>

              {user?.subscription?.provider &&
              SUBSCRIPTION_PROVIDER[user?.subscription?.provider] ? (
                <Button
                  title={
                    SUBSCRIPTION_PROVIDER[user?.subscription?.provider]?.title
                  }
                  onPress={() => {
                    eSendEvent(eOpenProgressDialog, {
                      title:
                        SUBSCRIPTION_PROVIDER[user?.subscription?.provider]
                          .title,
                      paragraph:
                        SUBSCRIPTION_PROVIDER[user?.subscription?.provider]
                          .desc,
                      noProgress: true,
                      icon:
                        SUBSCRIPTION_PROVIDER[user?.subscription?.provider]
                          .icon,
                    });
                  }}
                  style={{
                    alignSelf: 'flex-end',
                    marginTop: 10,
                    borderRadius: 3,
                  }}
                  fontSize={11}
                  textStyle={{
                    fontWeight: 'normal',
                  }}
                  height={20}
                  type="accent"
                />
              ) : null}
            </View>
          </View>
          {[
            {
              name: 'Save Data Recovery Key',
              func: async () => {
                eSendEvent(eOpenRecoveryKeyDialog);
              },
              desc:
                'Recover your data using the recovery key if your password is lost.',
            },
            {
              name: 'Change Password',
              func: async () => {
                eSendEvent(eOpenLoginDialog, 3);
              },
              desc: 'Setup a new password for your account.',
            },
          ].map((item) => (
            <CustomButton
              key={item.name}
              title={item.name}
              onPress={item.func}
              tagline={item.desc}
              color={item.name === 'Logout' ? colors.errorText : colors.pri}
            />
          ))}
        </>
      ) : null}
    </>
  );
};

const SettingsAppearanceSection = () => {
  const [state, dispatch] = useTracked();
  const {colors} = state;
  const settings = {...state.settings};
  function changeColorScheme(colors = COLOR_SCHEME, accent = ACCENT) {
    let newColors = setColorScheme(colors, accent);
    dispatch({type: Actions.THEME, colors: newColors});
  }

  function changeAccentColor(accentColor) {
    ACCENT.color = accentColor;
    ACCENT.shade = accentColor + '12';
    changeColorScheme();
  }

  const switchTheme = async () => {
    if (SettingsService.get().useSystemTheme) {
      await SettingsService.set('useSystemTheme', false);
    } else {
      await PremiumService.verify(async () => {
        await SettingsService.set(
          'useSystemTheme',
          SettingsService.get().useSystemTheme ? false : true,
        );
        if (SettingsService.get().useSystemTheme) {
          await MMKV.setStringAsync(
            'theme',
            JSON.stringify({night: Appearance.getColorScheme() === 'dark'}),
          );
          changeColorScheme(
            Appearance.getColorScheme() === 'dark'
              ? COLOR_SCHEME_DARK
              : COLOR_SCHEME_LIGHT,
          );
        }
      });
    }
  };

  return (
    <>
      <SectionHeader title="Appearance" />

      <View
        style={{
          paddingHorizontal: 12,
        }}>
        <Paragraph
          size={SIZE.md}
          style={{
            textAlignVertical: 'center',
          }}>
          Accent Color
        </Paragraph>
        <Paragraph size={SIZE.sm} color={colors.icon}>
          Change the accent color of the app.
        </Paragraph>
      </View>
      <View
        style={{
          borderRadius: 5,
          padding: 5,
          marginTop: 10,
          marginBottom: pv + 5,
          width: '100%',
          alignSelf: 'center',
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: 12,
        }}>
        {[
          '#e6194b',
          '#ffe119',
          '#0560FF',
          '#f58231',
          '#911eb4',
          '#46f0f0',
          '#f032e6',
          '#bcf60c',
          '#fabebe',
          '#00c853',
        ].map((item) => (
          <PressableButton
            key={item}
            customColor={
              colors.accent === item
                ? RGB_Linear_Shade(
                    !colors.night ? -0.2 : 0.2,
                    hexToRGBA(item, 1),
                  )
                : item
            }
            customSelectedColor={item}
            alpha={!colors.night ? -0.1 : 0.1}
            opacity={1}
            onPress={async () => {
              await PremiumService.verify(async () => {
                changeAccentColor(item);
                await MMKV.setStringAsync('accentColor', item);
              });
            }}
            customStyle={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              marginVertical: 5,
              marginHorizontal: 5,
              width: DDS.isLargeTablet()
                ? ((dWidth - 24 - 6 * 12) * 0.85 * 0.28) / 6
                : (dWidth - 24 - 6 * 12) / 6,
              height: DDS.isLargeTablet()
                ? ((dWidth - 24 - 6 * 12) * 0.85 * 0.28) / 6
                : (dWidth - 24 - 6 * 12) / 6,
              borderRadius: 100,
            }}>
            {colors.accent === item ? (
              <Icon size={SIZE.lg} color="white" name="check" />
            ) : null}
          </PressableButton>
        ))}
      </View>

      <CustomButton
        title="System Theme"
        tagline="Automatically switch to dark mode when the system theme changes."
        onPress={switchTheme}
        maxWidth="90%"
        customComponent={
          <Icon
            size={SIZE.xl}
            color={settings.useSystemTheme ? colors.accent : colors.icon}
            name={
              settings.useSystemTheme ? 'toggle-switch' : 'toggle-switch-off'
            }
          />
        }
      />

      <CustomButton
        title="Dark Mode"
        tagline="Switch on dark mode at night to protect your eyes."
        onPress={async () => {
          if (!colors.night) {
            await MMKV.setStringAsync('theme', JSON.stringify({night: true}));
            changeColorScheme(COLOR_SCHEME_DARK);
          } else {
            await MMKV.setStringAsync('theme', JSON.stringify({night: false}));

            changeColorScheme(COLOR_SCHEME_LIGHT);
          }
        }}
        maxWidth="90%"
        customComponent={
          <Icon
            size={SIZE.xl}
            color={colors.night ? colors.accent : colors.icon}
            name={colors.night ? 'toggle-switch' : 'toggle-switch-off'}
          />
        }
      />

      <CustomButton
        title="Homepage"
        tagline={'Default screen to open on app startup '}
        onPress={async () => {
          await PremiumService.verify(menuRef.current?.show);
        }}
        customComponent={
          <Menu
            ref={menuRef}
            animationDuration={200}
            style={{
              borderRadius: 5,
              backgroundColor: colors.bg,
            }}
            button={
              <TouchableOpacity
                onPress={async () => {
                  await PremiumService.verify(menuRef.current?.show);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                }}>
                <Paragraph>{settings.homepage}</Paragraph>
                <Icon color={colors.icon} name="menu-down" size={SIZE.md} />
              </TouchableOpacity>
            }>
            {MenuItemsList.slice(0, MenuItemsList.length - 1).map(
              (item, index) => (
                <MenuItem
                  key={item.name}
                  onPress={async () => {
                    menuRef.current?.hide();
                    await SettingsService.set('homepage', item.name);
                    ToastEvent.show({
                      heading: 'Homepage set to ' + item.name,
                      message: 'Restart the app for changes to take effect.',
                      type: 'success',
                    });
                  }}
                  style={{
                    backgroundColor:
                      settings.homepage === item.name
                        ? colors.shade
                        : 'transparent',
                  }}
                  textStyle={{
                    fontSize: SIZE.md,
                    color:
                      settings.homepage === item.name
                        ? colors.accent
                        : colors.pri,
                  }}>
                  {item.name}
                </MenuItem>
              ),
            )}
          </Menu>
        }
      />
    </>
  );
};

const SettingsPrivacyAndSecurity = () => {
  const [state] = useTracked();
  const {colors, settings} = state;
  const [vaultStatus, setVaultStatus] = React.useState({
    exists: false,
    biometryEnrolled: false,
    isBiometryAvailable: false,
  });

  const checkVaultStatus = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      db.vault.add('check_no_vault').catch(async (e) => {
        let biometry = await BiometricService.isBiometryAvailable();
        let fingerprint = await BiometricService.hasInternetCredentials();
        let available = false;
        if (biometry) {
          available = true;
        }
        if (e.message === db.vault.ERRORS.noVault) {
          setVaultStatus({
            exists: false,
            biometryEnrolled: fingerprint,
            isBiometryAvailable: available,
          });
        } else {
          setVaultStatus({
            exists: true,
            biometryEnrolled: fingerprint,
            isBiometryAvailable: available,
          });
        }
      });
    });
  });

  useEffect(() => {
    checkVaultStatus();
    eSubscribeEvent('vaultUpdated', () => checkVaultStatus());
    return () => {
      eUnSubscribeEvent('vaultUpdated', () => checkVaultStatus());
    };
  }, []);

  return (
    <>
      <SectionHeader title="Privacy & Security" />
      <CustomButton
        key="privacyMode"
        title="Privacy Mode"
        tagline="Hide app contents when you switch to other apps. This will also disable screenshot taking in the app."
        onPress={() => {
          Platform.OS === 'android'
            ? AndroidModule.setSecureMode(!settings.privacyScreen)
            : enabled(true);
          setSetting(settings, 'privacyScreen', !settings.privacyScreen);
        }}
        maxWidth="90%"
        customComponent={
          <Icon
            size={SIZE.xl}
            color={settings.privacyScreen ? colors.accent : colors.icon}
            name={
              settings.privacyScreen ? 'toggle-switch' : 'toggle-switch-off'
            }
          />
        }
      />

      {vaultStatus.exists ? (
        <>
          {vaultStatus.isBiometryAvailable ? (
            <CustomButton
              key="fingerprintVaultUnlock"
              title="Vault Biometic Unlock"
              tagline="Access notes in vault using biometrics"
              onPress={() => {
                openVault({
                  item: {},
                  fingerprintAccess: !vaultStatus.biometryEnrolled,
                  revokeFingerprintAccess: vaultStatus.biometryEnrolled,
                  novault: true,
                  title: vaultStatus.biometryEnrolled
                    ? 'Revoke biometric unlocking'
                    : 'Enable biometery unlock',
                  description: vaultStatus.biometryEnrolled
                    ? 'Disable biometric unlocking for notes in vault'
                    : 'Disable biometric unlocking for notes in vault',
                });
              }}
              maxWidth="90%"
              customComponent={
                <Icon
                  size={SIZE.xl}
                  color={
                    vaultStatus.biometryEnrolled ? colors.accent : colors.icon
                  }
                  name={
                    vaultStatus.biometryEnrolled
                      ? 'toggle-switch'
                      : 'toggle-switch-off'
                  }
                />
              }
            />
          ) : null}
          <CustomButton
            key="changeVaultPassword"
            title="Change vault password"
            tagline="Setup a new password for the vault"
            onPress={() => {
              openVault({
                item: {},
                changePassword: true,
                novault: true,
                title: 'Change vault password',
                description: 'Set a new password for your vault.',
              });
            }}
          />
        </>
      ) : (
        <CustomButton
          key="createVault"
          title="Create vault"
          tagline="Secure your notes by adding the to the vault."
          onPress={() => {
            PremiumService.verify(() => {
              openVault({
                item: {},
                novault: false,
                title: 'Create vault',
                description: 'Set a password to create vault and lock notes.',
              });
            });
          }}
        />
      )}
    </>
  );
};

const SettingsBackupAndRestore = () => {
  const [state] = useTracked();
  const {colors, settings, user} = state;

  const backupItemsList = [
    {
      name: 'Backup data',
      func: async () => {
        await Backup.run();
      },
      desc: 'Backup your data to phone storage',
    },
    {
      name: 'Restore backup',
      func: () => {
        eSendEvent(eOpenRestoreDialog);
      },
      desc: 'Restore backup from phone storage.',
    },
  ];

  return (
    <>
      <SectionHeader title="Backup & restore" />

      {backupItemsList.map((item) => (
        <CustomButton
          key={item.name}
          title={item.name}
          tagline={item.desc}
          onPress={item.func}
        />
      ))}

      <View
        style={{
          width: '100%',
          marginHorizontal: 0,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 50,
          paddingHorizontal: 12,
        }}>
        <View
          style={{
            maxWidth: '60%',
          }}>
          <Paragraph
            size={SIZE.md}
            style={{
              textAlignVertical: 'center',
              maxWidth: '100%',
            }}>
            Auto Backup
          </Paragraph>
          <Paragraph color={colors.icon} size={SIZE.sm}>
            Backup your data automatically.
          </Paragraph>
        </View>

        <View
          style={{
            flexDirection: 'row',
            overflow: 'hidden',
            borderRadius: 5,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          {[
            {
              title: 'Never',
              value: 'off',
            },
            {
              title: 'Daily',
              value: 'daily',
            },
            {
              title: 'Weekly',
              value: 'weekly',
            },
          ].map((item) => (
            <TouchableOpacity
              activeOpacity={1}
              onPress={async () => {
                if (item.value === 'off') {
                  await SettingsService.set('reminder', item.value);
                } else {
                  await PremiumService.verify(async () => {
                    if (Platform.OS === 'android') {
                      let granted = await Storage.requestPermission();
                      if (!granted) {
                        ToastEvent.show({
                          heading: 'Could not enable auto backups',
                          message:
                            'You must give storage access to enable auto backups.',
                          type: 'error',
                          context: 'local',
                        });
                        return;
                      }
                    }
                    await SettingsService.set('reminder', item.value);
                    //await Backup.run();
                  });
                }
              }}
              key={item.value}
              style={{
                backgroundColor:
                  settings.reminder === item.value ? colors.accent : colors.nav,
                justifyContent: 'center',
                alignItems: 'center',
                width: 50,
                height: 20,
              }}>
              <Paragraph
                color={settings.reminder === item.value ? 'white' : colors.icon}
                size={SIZE.xs}>
                {item.title}
              </Paragraph>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <CustomButton
        title="Backup encryption"
        tagline="Encrypt all your backups."
        onPress={async () => {
          if (!user) {
            ToastEvent.show({
              heading: 'Login required to enable encryption',
              type: 'error',
              func: () => {
                eSendEvent(eOpenLoginDialog);
              },
              actionText: 'Login',
            });
            return;
          }
          await SettingsService.set(
            'encryptedBackup',
            !settings.encryptedBackup,
          );
        }}
        customComponent={
          <Icon
            size={SIZE.xl}
            color={settings.encryptedBackup ? colors.accent : colors.icon}
            name={
              settings.encryptedBackup ? 'toggle-switch' : 'toggle-switch-off'
            }
          />
        }
      />
    </>
  );
};
