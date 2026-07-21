import React from "react";
import {
  View,
  Text,
  StyleSheet,
} from "react-native";


export default function TrafficHeroSection() {

  return (

    <View style={styles.pageSection}>


      <View style={styles.heroPanel}>


        <View style={styles.heroContent}>


          <Text style={styles.eyebrow}>
            REAL-TIME TRAFFIC MONITORING SYSTEM
          </Text>


          <Text style={styles.title}>
            Monitor Traffic Flow,
            {"\n"}
            Detect Congestion,
            {"\n"}
            and Find Safer Routes.
          </Text>


          <Text style={styles.description}>
            FRENDS provides real-time traffic condition
            monitoring using smart road data, helping
            commuters avoid congested areas and make
            better navigation decisions during heavy
            traffic and severe weather conditions.
          </Text>



          {/* Traffic Summary Cards */}

          <View style={styles.trafficSummary}>


            <View style={styles.summaryCard}>

              <Text style={styles.summaryLabel}>
                Current Traffic
              </Text>

              <Text style={styles.summaryValue}>
                MODERATE
              </Text>

            </View>



            <View style={styles.summaryCard}>

              <Text style={styles.summaryLabel}>
                Active Roads
              </Text>

              <Text style={styles.summaryValue}>
                24
              </Text>

            </View>



            <View style={styles.summaryCard}>

              <Text style={styles.summaryLabel}>
                Average Speed
              </Text>

              <Text style={styles.summaryValue}>
                42 km/h
              </Text>

            </View>


          </View>


        </View>



        {/* Traffic System Status */}


        <View style={styles.statusCard}>


          <Text style={styles.statusLabel}>
            Traffic System
          </Text>


          <Text style={styles.statusOnline}>
            ONLINE
          </Text>


          <Text style={styles.statusDescription}>
            Monitoring road conditions,
            congestion levels, vehicle flow,
            and navigation updates.
          </Text>


        </View>



      </View>


    </View>

  );

}


