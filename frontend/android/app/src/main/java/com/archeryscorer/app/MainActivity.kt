package com.archeryscorer.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.archeryscorer.app.ui.theme.ArcheryScorerTheme
import com.archeryscorer.app.ui.screens.HomeScreen
import com.archeryscorer.app.ui.screens.SessionSetupScreen
import com.archeryscorer.app.ui.screens.ScoringScreen
import com.archeryscorer.app.ui.screens.HistoryScreen
import com.archeryscorer.app.ui.screens.BowsScreen
import com.archeryscorer.app.ui.screens.BackupScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ArcheryScorerTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val navController = rememberNavController()
                    
                    NavHost(
                        navController = navController,
                        startDestination = "home"
                    ) {
                        composable("home") {
                            HomeScreen(
                                onNewSession = { navController.navigate("session_setup") },
                                onHistory = { navController.navigate("history") },
                                onBows = { navController.navigate("bows") },
                                onBackup = { navController.navigate("backup") }
                            )
                        }
                        composable("session_setup") {
                            SessionSetupScreen(
                                onBack = { navController.popBackStack() },
                                onStartSession = { navController.navigate("scoring") }
                            )
                        }
                        composable("scoring") {
                            ScoringScreen(
                                onBack = { navController.popBackStack() },
                                onFinish = { navController.navigate("home") { popUpTo("home") { inclusive = true } } }
                            )
                        }
                        composable("history") {
                            HistoryScreen(onBack = { navController.popBackStack() })
                        }
                        composable("bows") {
                            BowsScreen(onBack = { navController.popBackStack() })
                        }
                        composable("backup") {
                            BackupScreen(onBack = { navController.popBackStack() })
                        }
                    }
                }
            }
        }
    }
}
