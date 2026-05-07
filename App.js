import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, SafeAreaView, TextInput, TouchableOpacity, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getTheatres, loginUser, registerUser, getUserProfile, makeReservation, getShowsByTheatre, getShowtimes, getSeats } from './src/services/api';

export default function App() {
    // App State
    const [userToken, setUserToken] = useState(null);
    const [currentScreen, setCurrentScreen] = useState('theatres'); 
    const [loading, setLoading] = useState(false);

    // Data State
    const [theatres, setTheatres] = useState([]);
    const [profileData, setProfileData] = useState({ user: null, reservations: [] });

    // Wizard Memory State
    const [bookingStep, setBookingStep] = useState(0);
    const [selectedTheatre, setSelectedTheatre] = useState(null);
    const [selectedShow, setSelectedShow] = useState(null);
    const [selectedTime, setSelectedTime] = useState(null);
    const [selectedSeats, setSelectedSeats] = useState([]);

    // Live Database Lists
    const [dbShows, setDbShows] = useState([]);
    const [dbTimes, setDbTimes] = useState([]);
    const [dbSeats, setDbSeats] = useState([]);

    // Auth Form State
    const [isLoginScreen, setIsLoginScreen] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        checkLoginStatus();
    }, []);

    const checkLoginStatus = async () => {
        const token = await SecureStore.getItemAsync('jwt_token');
        if (token) {
            setUserToken(token);
            fetchTheatres();
        }
    };

    // --- MAIN API CALLS ---
    const fetchTheatres = async () => {
        setLoading(true);
        try {
            const data = await getTheatres();
            setTheatres(data);
        } catch (error) {
            Alert.alert("Error", "Could not load theatres.");
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const data = await getUserProfile(userToken);
            setProfileData(data);
            setCurrentScreen('profile');
        } catch (error) {
            Alert.alert("Error", "Could not load profile.");
        } finally {
            setLoading(false);
        }
    };

    // --- WIZARD LOGIC ---
    const startWizardForTheatre = async (theatre) => {
        setSelectedTheatre(theatre);
        setLoading(true);
        try {
            const shows = await getShowsByTheatre(theatre.theatre_id);
            setDbShows(shows);
            setBookingStep(1);
        } catch (error) {
            Alert.alert("Error", "Failed to load shows.");
        }
        setLoading(false);
    };

    const selectShow = async (show) => {
        setSelectedShow(show);
        setLoading(true);
        try {
            const times = await getShowtimes(show.show_id);
            setDbTimes(times);
            setBookingStep(2);
        } catch (error) {
            Alert.alert("Error", "Failed to load showtimes.");
        }
        setLoading(false);
    };

    const selectTime = async (time) => {
        setSelectedTime(time);
        setLoading(true);
        try {
            // 🚀 Fetching seats for THIS specific showtime to check availability
            const seats = await getSeats(time.showtime_id);
            setDbSeats(seats);
            setBookingStep(3);
        } catch (error) {
            Alert.alert("Error", "Failed to load seats.");
        }
        setLoading(false);
    };

    const toggleSeatSelection = (seat) => {
        const isAlreadySelected = selectedSeats.find(s => s.seat_id === seat.seat_id);
        if (isAlreadySelected) {
            setSelectedSeats(selectedSeats.filter(s => s.seat_id !== seat.seat_id));
        } else {
            setSelectedSeats([...selectedSeats, seat]);
        }
    };

    const handleBookTicket = async () => {
        if (selectedSeats.length === 0) return;

        setLoading(true);
        try {
            for (const seat of selectedSeats) {
                await makeReservation(selectedTime.showtime_id, seat.seat_id, userToken);
            }
            Alert.alert("Success! 🎉", `Successfully reserved ${selectedSeats.length} seats!`);
            
            // Clean Reset
            setBookingStep(0);
            setSelectedTheatre(null);
            setSelectedShow(null);
            setSelectedTime(null);
            setSelectedSeats([]); 
            fetchProfile(); 
        } catch (error) {
            Alert.alert("Booking Error", "One or more seats could not be reserved.");
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async () => { 
        if (!email || !password || (!isLoginScreen && !name)) { Alert.alert("Wait!", "Please fill fields."); return; }
        try {
            if (isLoginScreen) {
                const response = await loginUser(email, password);
                await SecureStore.setItemAsync('jwt_token', response.token);
                setUserToken(response.token); fetchTheatres();
            } else {
                await registerUser(name, email, password);
                Alert.alert("Success!", "Account created. Please log in."); setIsLoginScreen(true);
            }
        } catch (error) { Alert.alert("Error", error.error || "Something went wrong!"); }
    };

    const handleLogout = async () => { 
        try {
            await SecureStore.deleteItemAsync('jwt_token');
            setUserToken(null); setProfileData({ user: null, reservations: [] }); setCurrentScreen('theatres');
        } catch (error) { console.error("Logout Error:", error); }
    };

  // ==========================================
  // --- RENDER LOGIC ---
  // ==========================================

  if (!userToken) {
    return (
      <SafeAreaView style={styles.authScreen}>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>{isLoginScreen ? 'Welcome Back 👋' : 'Create Account 🚀'}</Text>
          {!isLoginScreen && <TextInput style={styles.input} placeholder="Full Name" value={name} onChangeText={setName} />}
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={styles.authButton} onPress={handleAuth}><Text style={styles.buttonText}>{isLoginScreen ? 'Log In' : 'Sign Up'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setIsLoginScreen(!isLoginScreen)}><Text style={styles.switchText}>{isLoginScreen ? "Don't have an account? Sign Up" : "Already have an account? Log In"}</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScreen === 'profile') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>My Profile 👤</Text>
          <TouchableOpacity onPress={() => setCurrentScreen('theatres')}><Text style={styles.linkText}>Back</Text></TouchableOpacity>
        </View>
        <View style={styles.content}>
          <View style={{ padding: 20 }}>
            <Text style={styles.profileName}>{profileData.user?.name}</Text>
            <Text style={styles.profileEmail}>{profileData.user?.email}</Text>
            <Text style={styles.sectionTitle}>My Tickets 🎟️</Text>
          </View>
          <FlatList
            data={profileData.reservations}
            keyExtractor={(item) => item.reservation_id.toString()}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{item.show_title}</Text>
                <Text>📍 {item.theatre_name}</Text>
                <Text>🕒 {new Date(item.start_time).toLocaleString()}</Text>
                <Text style={{ color: 'green', fontWeight: 'bold' }}>Seat: {item.seat_number}</Text>
              </View>
            )}
          />
          <TouchableOpacity style={[styles.authButton, { backgroundColor: 'red', margin: 20 }]} onPress={handleLogout}><Text style={styles.buttonText}>Log Out</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (bookingStep > 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {bookingStep === 1 ? '1. Pick a Play 🎭' : bookingStep === 2 ? '2. Pick a Time 🕒' : '3. Pick Seats 🪑'}
          </Text>
          <TouchableOpacity onPress={() => { setBookingStep(0); setSelectedTheatre(null); setSelectedShow(null); setSelectedTime(null); setSelectedSeats([]); }}>
            <Text style={styles.logoutText}>Cancel</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {bookingStep === 1 && (
            <FlatList data={dbShows} keyExtractor={item => item.show_id.toString()} contentContainerStyle={{ padding: 20 }} ListHeaderComponent={<Text style={styles.sectionTitle}>Now playing at {selectedTheatre?.name}</Text>} renderItem={({ item }) => (
                <TouchableOpacity style={styles.card} onPress={() => selectShow(item)}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                  <Text style={{ color: '#007AFF', marginTop: 10, fontWeight: 'bold' }}>See Times ➡️</Text>
                </TouchableOpacity>
            )}/>
          )}

          {bookingStep === 2 && (
            <View style={{ padding: 20 }}>
              <Text style={styles.sectionTitle}>{selectedShow?.title}</Text>
              {dbTimes.map(time => (
                <TouchableOpacity key={time.showtime_id} style={styles.card} onPress={() => selectTime(time)}>
                  <Text style={styles.cardTitle}>🕒 {new Date(time.start_time).toLocaleString()}</Text>
                  <Text style={{ color: '#007AFF', marginTop: 10, fontWeight: 'bold' }}>Select Seats ➡️</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {bookingStep === 3 && (
            <View style={{ padding: 20 }}>
              <Text style={styles.sectionTitle}>{selectedShow?.title}</Text>
              <Text style={{ color: '#666', marginBottom: 10 }}>{new Date(selectedTime?.start_time).toLocaleString()}</Text>
              <Text style={{ marginBottom: 15, color: '#007AFF', fontWeight: 'bold' }}>Selected: {selectedSeats.map(s => s.seat_number).join(', ')}</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                {dbSeats.map(seat => {
                  const isSel = selectedSeats.find(s => s.seat_id === seat.seat_id);
                  const isOccupied = seat.is_taken > 0;
                  return (
                    <TouchableOpacity 
                      key={seat.seat_id} 
                      disabled={isOccupied}
                      style={[styles.card, { 
                        width: '28%', 
                        marginHorizontal: '2%', 
                        alignItems: 'center', 
                        backgroundColor: isOccupied ? '#ddd' : (isSel ? '#007AFF' : '#fff'),
                        opacity: isOccupied ? 0.6 : 1
                      }]} 
                      onPress={() => toggleSeatSelection(seat)}
                    >
                      <Text style={{ 
                        fontWeight: 'bold', 
                        fontSize: 16, 
                        color: isOccupied ? '#888' : (isSel ? '#fff' : '#000'),
                        textDecorationLine: isOccupied ? 'line-through' : 'none'
                      }}>
                        {seat.seat_number}
                      </Text>
                      <Text style={{ fontSize: 10, color: isOccupied ? '#888' : (isSel ? '#fff' : '#28a745') }}>
                        {isOccupied ? 'Taken' : `$${seat.price}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedSeats.length > 0 && (
                <TouchableOpacity style={[styles.authButton, { backgroundColor: '#28a745', marginTop: 40 }]} onPress={handleBookTicket}>
                  <Text style={styles.buttonText}>Confirm {selectedSeats.length} Ticket{selectedSeats.length > 1 ? 's' : ''} ✅</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Theatres 🎭</Text>
        <View style={styles.navButtons}>
          <TouchableOpacity style={styles.navItem} onPress={fetchProfile}><Text style={styles.linkText}>Profile</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={handleLogout}><Text style={styles.logoutText}>Logout</Text></TouchableOpacity>
        </View>
      </View>
      <View style={styles.content}>
        {loading ? <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} /> : (
          <FlatList data={theatres} keyExtractor={(item) => item.theatre_id.toString()} contentContainerStyle={{ paddingBottom: 100 }} renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => startWizardForTheatre(item)}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardLocation}>📍 {item.location}</Text>
              <Text style={{ color: '#007AFF', marginTop: 15, fontWeight: 'bold', textAlign: 'center' }}>See Plays ➡️</Text>
            </TouchableOpacity>
          )}/>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1 },
  authScreen: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
  authContainer: { padding: 30 },
  authTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: '#f1f3f5', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e9ecef' },
  authButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  switchText: { textAlign: 'center', marginTop: 20, color: '#007AFF', fontWeight: '600' },
  header: { height: 90, paddingTop: 35, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 22, fontWeight: 'bold' },
  navButtons: { flexDirection: 'row' },
  navItem: { padding: 10, marginLeft: 5 },
  linkText: { color: '#007AFF', fontWeight: 'bold' },
  logoutText: { color: '#FF3B30', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', marginHorizontal: 15, marginTop: 15, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardLocation: { color: '#666', marginVertical: 5 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  profileName: { fontSize: 24, fontWeight: 'bold' },
  profileEmail: { color: '#666', marginBottom: 20 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});