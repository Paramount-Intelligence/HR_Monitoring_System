import { StyleSheet, Text, View } from 'react-native';

import { Animated } from 'react-native';

import { colors } from '../../theme';

import { getInitialsFromName } from '../../utils/messages';

import { usePulseRing } from '../../animations/usePulseRing';



interface CallParticipantAvatarProps {

  name: string;

  size?: 'md' | 'lg' | 'xl';

  ringColor?: string;

  pulse?: boolean;

}



const sizes = {

  md: { outer: 112, font: 40 },

  lg: { outer: 160, font: 56 },

  xl: { outer: 200, font: 72 },

};



export function CallParticipantAvatar({

  name,

  size = 'lg',

  ringColor = 'rgba(0, 55, 176, 0.45)',

  pulse = false,

}: CallParticipantAvatarProps) {

  const dim = sizes[size];

  const initial = getInitialsFromName(name);

  const pulseStyle = usePulseRing({ enabled: pulse });



  return (

    <View style={[styles.wrap, { width: dim.outer, height: dim.outer }]}>

      {pulse ? (

        <Animated.View

          style={[

            styles.pulse,

            { borderColor: ringColor },

            pulseStyle.style,

          ]}

        />

      ) : null}

      <View

        style={[

          styles.avatar,

          {

            width: dim.outer,

            height: dim.outer,

            borderRadius: dim.outer / 2,

            borderColor: ringColor,

          },

        ]}

      >

        <Text style={[styles.initial, { fontSize: dim.font }]}>{initial}</Text>

      </View>

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: {

    alignItems: 'center',

    justifyContent: 'center',

  },

  pulse: {

    ...StyleSheet.absoluteFillObject,

    borderRadius: 999,

    borderWidth: 2,

  },

  avatar: {

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 4,

    backgroundColor: colors.primaryContainer,

  },

  initial: {

    color: colors.white,

    fontWeight: '800',

  },

});


