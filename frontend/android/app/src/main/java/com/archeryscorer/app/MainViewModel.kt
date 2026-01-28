package com.archeryscorer.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.archeryscorer.app.data.model.*
import com.archeryscorer.app.data.repository.AppRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID

data class AppState(
    val sessions: List<Session> = emptyList(),
    val bows: List<Bow> = emptyList(),
    val currentSession: Session? = null,
    val currentTargetType: TargetType = TargetType.WA_STANDARD,
    val currentRound: Int = 1,
    val currentShots: List<Shot> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

class MainViewModel : ViewModel() {
    
    private val repository = AppRepository()
    
    private val _state = MutableStateFlow(AppState())
    val state: StateFlow<AppState> = _state.asStateFlow()
    
    // Load all sessions
    fun loadSessions() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            repository.getSessions()
                .onSuccess { sessions ->
                    _state.value = _state.value.copy(
                        sessions = sessions,
                        isLoading = false
                    )
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = e.message
                    )
                }
        }
    }
    
    // Load all bows
    fun loadBows() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            repository.getBows()
                .onSuccess { bows ->
                    _state.value = _state.value.copy(
                        bows = bows,
                        isLoading = false
                    )
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(
                        isLoading = false,
                        error = e.message
                    )
                }
        }
    }
    
    // Create a new session
    fun createSession(request: CreateSessionRequest) {
        viewModelScope.launch {
            repository.createSession(request)
                .onSuccess { session ->
                    _state.value = _state.value.copy(
                        currentSession = session,
                        currentRound = 1,
                        currentShots = emptyList()
                    )
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(error = e.message)
                }
        }
    }
    
    // Delete a session
    fun deleteSession(id: String) {
        viewModelScope.launch {
            repository.deleteSession(id)
                .onSuccess {
                    _state.value = _state.value.copy(
                        sessions = _state.value.sessions.filter { it.id != id }
                    )
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(error = e.message)
                }
        }
    }
    
    // Add a shot
    fun addShot(x: Float, y: Float, ring: Int) {
        val shot = Shot(x = x, y = y, ring = ring)
        _state.value = _state.value.copy(
            currentShots = _state.value.currentShots + shot
        )
    }
    
    // Undo last shot
    fun undoShot() {
        val shots = _state.value.currentShots
        if (shots.isNotEmpty()) {
            _state.value = _state.value.copy(
                currentShots = shots.dropLast(1)
            )
        }
    }
    
    // Finish current round
    fun finishRound() {
        val currentSession = _state.value.currentSession ?: return
        val shots = _state.value.currentShots
        
        if (shots.isEmpty()) return
        
        val roundScore = shots.sumOf { it.ring }
        val request = CreateRoundRequest(
            shots = shots,
            totalScore = roundScore
        )
        
        viewModelScope.launch {
            repository.addRound(currentSession.id, request)
                .onSuccess { updatedSession ->
                    _state.value = _state.value.copy(
                        currentSession = updatedSession,
                        currentRound = _state.value.currentRound + 1,
                        currentShots = emptyList()
                    )
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(error = e.message)
                }
        }
    }
    
    // Add a bow
    fun addBow(name: String, type: String, notes: String) {
        val bow = Bow(
            id = UUID.randomUUID().toString(),
            name = name,
            type = type,
            notes = notes
        )
        
        viewModelScope.launch {
            repository.createBow(bow)
                .onSuccess { createdBow ->
                    _state.value = _state.value.copy(
                        bows = _state.value.bows + createdBow
                    )
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(error = e.message)
                }
        }
    }
    
    // Delete a bow
    fun deleteBow(id: String) {
        viewModelScope.launch {
            repository.deleteBow(id)
                .onSuccess {
                    _state.value = _state.value.copy(
                        bows = _state.value.bows.filter { it.id != id }
                    )
                }
                .onFailure { e ->
                    _state.value = _state.value.copy(error = e.message)
                }
        }
    }
    
    // Set target type
    fun setTargetType(type: TargetType) {
        _state.value = _state.value.copy(currentTargetType = type)
    }
    
    // Reset session state
    fun resetSession() {
        _state.value = _state.value.copy(
            currentSession = null,
            currentRound = 1,
            currentShots = emptyList()
        )
    }
    
    // Clear error
    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}
