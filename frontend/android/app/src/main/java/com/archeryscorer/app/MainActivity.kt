package com.archeryscorer.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.rememberNavController
import com.archeryscorer.app.navigation.AppNavigation
import com.archeryscorer.app.ui.theme.ArcheryScorerTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        
        setContent {
            ArcheryScorerTheme {
                val viewModel: MainViewModel = viewModel()
                val state by viewModel.state.collectAsState()
                val navController = rememberNavController()
                
                Scaffold(
                    modifier = Modifier.fillMaxSize()
                ) { innerPadding ->
                    AppNavigation(
                        navController = navController,
                        sessions = state.sessions,
                        bows = state.bows,
                        currentSession = state.currentSession,
                        currentTargetType = state.currentTargetType,
                        currentRound = state.currentRound,
                        currentShots = state.currentShots,
                        isLoading = state.isLoading,
                        onLoadSessions = viewModel::loadSessions,
                        onLoadBows = viewModel::loadBows,
                        onCreateSession = viewModel::createSession,
                        onDeleteSession = viewModel::deleteSession,
                        onAddShot = viewModel::addShot,
                        onUndoShot = viewModel::undoShot,
                        onFinishRound = viewModel::finishRound,
                        onAddBow = viewModel::addBow,
                        onDeleteBow = viewModel::deleteBow,
                        onSetTargetType = viewModel::setTargetType,
                        onResetSession = viewModel::resetSession
                    )
                }
                
                // Error handling snackbar
                state.error?.let { error ->
                    LaunchedEffect(error) {
                        // Show snackbar or toast
                        viewModel.clearError()
                    }
                }
            }
        }
    }
}
