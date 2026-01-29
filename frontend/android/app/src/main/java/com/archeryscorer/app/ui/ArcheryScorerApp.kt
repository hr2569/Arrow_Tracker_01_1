package com.archeryscorer.app.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.archeryscorer.app.ui.screens.HomeScreen
import com.archeryscorer.app.ui.screens.BowsScreen
import com.archeryscorer.app.ui.screens.HistoryScreen
import com.archeryscorer.app.ui.screens.BackupScreen

@Composable
fun ArcheryScorerApp() {
    val navController = rememberNavController()
    
    NavHost(
        navController = navController,
        startDestination = "home"
    ) {
        composable("home") {
            HomeScreen(
                onNavigateToHistory = { navController.navigate("history") },
                onNavigateToBows = { navController.navigate("bows") },
                onNavigateToBackup = { navController.navigate("backup") }
            )
        }
        composable("bows") {
            BowsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("history") {
            HistoryScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
        composable("backup") {
            BackupScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
