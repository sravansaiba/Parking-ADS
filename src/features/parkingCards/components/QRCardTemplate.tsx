import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

interface QRCardTemplateProps {
  code: string;
  label: string;
  tenantName: string;
  address?: string;
  description: {
    heading: string;
    points: string[];
    footer: string;
  };
  language: string;
}

const QRCardTemplate: React.FC<QRCardTemplateProps> = ({ 
  code, 
  label, 
  tenantName, 
  address,
  description, 
  language 
}) => {
  return (
    <View 
      style={styles.container}
      collapsable={false} // ✅ Prevent React Native from optimizing away the view
    >
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.tenantName}>{tenantName}</Text>
        {address && (
          <Text style={styles.address}>{address}</Text>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        
        {/* QR Code */}
        <View style={styles.qrContainer}>
          <QRCode value={code} size={150} backgroundColor="white" />
        </View>
        
        {/* Code Number */}
        <Text style={styles.codeNumber}>
          {code.replace('APK-', '')}
        </Text>
        
        {/* Terms & Conditions */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsHeading}>{description.heading}</Text>
          {description.points.map((point, index) => (
            <Text key={index} style={styles.termPoint}>• {point}</Text>
          ))}
        </View>
      </View>

      {/* Footer */}
      {/* <View style={styles.footer}>
        <Text style={styles.footerText}>powered by</Text>
        <Text style={styles.footerBrand}>parkweb.in</Text>
      </View> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    minHeight: 400,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignSelf: 'center',
  },
  header: {
    backgroundColor: '#F97316',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    width: '100%',
  },
  tenantName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  address: {
    fontSize: 12,
    color: 'white',
    textAlign: 'center',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  label: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#0F172A',
  },
  qrContainer: {
    marginVertical: 12,
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 8,
  },
  codeNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginVertical: 12,
  },
  termsContainer: {
    marginTop: 16,
    width: '100%',
  },
  termsHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  termPoint: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 4,
    lineHeight: 14,
  },
  footer: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    width: '100%',
  },
  footerText: {
    fontSize: 12,
    color: '#475569',
    marginRight: 4,
  },
  footerBrand: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0EA5E9',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});

export default QRCardTemplate;