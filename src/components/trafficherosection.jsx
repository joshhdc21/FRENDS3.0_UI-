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



const styles = StyleSheet.create({


  pageSection: {
    marginBottom: 30,
  },


  heroPanel: {

    padding: 25,

    borderRadius: 28,

    backgroundColor: "#ffffff",

    shadowColor: "#184e8f",
    shadowOpacity: 0.1,
    shadowRadius: 15,

    elevation: 5,

  },


  heroContent: {

    width: "100%",

  },


  eyebrow: {

    color: "#083b8a",

    fontSize: 11,

    fontWeight: "900",

    letterSpacing: 1.5,

    marginBottom: 10,

  },


  title: {

    color: "#14213d",

    fontSize: 34,

    fontWeight: "900",

    lineHeight: 40,

  },


  description: {

    marginTop: 18,

    color: "#667085",

    fontSize: 16,

    lineHeight: 24,

  },


  trafficSummary: {

    flexDirection: "row",

    flexWrap: "wrap",

    gap: 12,

    marginTop: 25,

  },


  summaryCard: {

    width: 120,

    padding: 15,

    borderRadius: 15,

    backgroundColor: "#ffffff",

    borderWidth: 1,

    borderColor: "#dbe4f0",

  },


  summaryLabel: {

    color: "#667085",

    fontSize: 11,

    fontWeight: "800",

  },


  summaryValue: {

    marginTop: 8,

    color: "#083b8a",

    fontSize: 18,

    fontWeight: "900",

  },


  statusCard: {

    marginTop: 25,

    padding: 22,

    borderRadius: 20,

    backgroundColor: "#eef6ff",

  },


  statusLabel: {

    color: "#667085",

    fontSize: 12,

  },


  statusOnline: {

    marginTop: 8,

    color: "#198754",

    fontSize: 22,

    fontWeight: "900",

  },


  statusDescription: {

    marginTop: 8,

    color: "#667085",

    fontSize: 13,

    lineHeight: 20,

  },


});