package com.archeryscorer.app.navigation

import androidx.compose.runtime.*
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.archeryscorer.app.data.model.*
import com.archeryscorer.app.ui.screens.*

sealed class Screen(val route: String) {
    object Home : Screen("home")
    object SessionSetup : Screen("session_setup")
    object Scoring : Screen("scoring")
    object Summary : Screen("summary")
    object History : Screen("history")
    object Bows : Screen("bows")
    object Settings : Screen("settings")
}

@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController(),
    sessions: List<Session>,
    bows: List<Bow>,
    currentSession: Session?,
    currentTargetType: TargetType,
    currentRound: Int,
    currentShots: List<Shot>,
    isLoading: Boolean,
    onLoadSessions: () -> Unit,
    onLoadBows: () -> Unit,
    onCreateSession: (CreateSessionRequest) -> Unit,
    onDeleteSession: (String) -> Unit,
    onAddShot: (Float, Float, Int) -> Unit,
    onUndoShot: () -> Unit,
    onFinishRound: () -> Unit,
    onAddBow: (String, String, String) -> Unit,
    onDeleteBow: (String) -> Unit,
    onSetTargetType: (TargetType) -> Unit,
    onResetSession: () -> Unit
) {
    NavHost(
        navController = navController,
        startDestination = Screen.Home.route
    ) {
        composable(Screen.Home.route) {
            HomeScreen(
                onNewSession = { navController.navigate(Screen.SessionSetup.route) },
                onHistory = {
                    onLoadSessions()
                    navController.navigate(Screen.History.route)
                },
                onBows = {
                    onLoadBows()
                    navController.navigate(Screen.Bows.route)
                },
                onSettings = { navController.navigate(Screen.Settings.route) }
            )
        }
        
        composable(Screen.SessionSetup.route) {
            LaunchedEffect(Unit) {
                onLoadBows()
            }
            
            SessionSetupScreen(
                bows = bows,
                onStartSession = { bowId, bowName, distance, targetType ->
                    onSetTargetType(targetType)
                    val request = CreateSessionRequest(
                        name = "Training ${java.text.SimpleDateFormat("MMM d", java.util.Locale.getDefault()).format(java.util.Date())}",
                        sessionType = "training",
                        bowId = bowId,
                        bowName = bowName,
                        distance = distance,
                        targetType = targetType.toApiString()
                    )
                    onCreateSession(request)
                    navController.navigate(Screen.Scoring.route) {
                        popUpTo(Screen.Home.route)
                    }
                },
                onBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Scoring.route) {
            ScoringScreen(
                session = currentSession,
                targetType = currentTargetType,
                currentRound = currentRound,
                currentShots = currentShots,
                onShotAdded = onAddShot,
                onUndoShot = onUndoShot,
                onFinishRound = onFinishRound,
                onEndSession = {
                    navController.navigate(Screen.Summary.route) {
                        popUpTo(Screen.Scoring.route) { inclusive = true }
                    }
                },
                onBack = {
                    navController.navigate(Screen.Summary.route) {
                        popUpTo(Screen.Scoring.route) { inclusive = true }
                    }
                }
            )
        }
        
        composable(Screen.Summary.route) {
            currentSession?.let { session ->
                SummaryScreen(
                    session = session,
                    onDone = {
                        onResetSession()
                        navController.navigate(Screen.Home.route) {
                            popUpTo(Screen.Home.route) { inclusive = true }
                        }
                    },
                    onNewRound = {
                        navController.popBackStack()
                        navController.navigate(Screen.Scoring.route)
                    }
                )
            } ?: run {
                navController.navigate(Screen.Home.route) {
                    popUpTo(Screen.Home.route) { inclusive = true }
                }
            }
        }
        
        composable(Screen.History.route) {
            HistoryScreen(
                sessions = sessions,
                isLoading = isLoading,
                onSessionClick = { /* View session details */ },
                onDeleteSession = onDeleteSession,
                onBack = { navController.popBackStack() },
                onRefresh = onLoadSessions
            )
        }
        
        composable(Screen.Bows.route) {
            BowsScreen(
                bows = bows,
                isLoading = isLoading,
                onAddBow = onAddBow,
                onDeleteBow = onDeleteBow,
                onBack = { navController.popBackStack() }
            )
        }
        
        composable(Screen.Settings.route) {
            SettingsScreen(
                onBack = { navController.popBackStack() }
            )
        }
    }
}
