# Game Publishing Script
# Publishes frontend and PHP backend to F:\WebHatchery for server sync

param(
    [Alias('f')]
    [switch]$Frontend,
    [Alias('b')]
    [switch]$Backend,
    [Alias('a')]
    [switch]$All,
    [Alias('c')]
    [switch]$Clean,
    [Alias('v')]
    [switch]$Verbose,
    [Alias('p')]
    [switch]$Production
)

# Auto-detect project name from current directory
$PROJECT_NAME = Split-Path -Leaf $PSScriptRoot

# Load .env file
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^(\w+)=(.*)$") {
            $name = $matches[1]
            $value = $matches[2]
            Set-Variable -Name $name -Value $value -Scope Script
        }
    }
} else {
    Write-Error ".env file not found! Please create a .env file in the project root with the following content:"
    Write-Host "PREVIEW_ROOT=" -ForegroundColor Yellow
    Write-Host "PRODUCTION_ROOT=" -ForegroundColor Yellow
    exit 1
}

# Set destination based on Production flag
$DEST_ROOT = if ($Production) { $PRODUCTION_ROOT } else { $PREVIEW_ROOT }
$DEST_DIR = Join-Path $DEST_ROOT $PROJECT_NAME
$FRONTEND_SRC = "$PSScriptRoot\frontend"
$BACKEND_SRC = "$PSScriptRoot\backend"
$FRONTEND_DEST = $DEST_DIR  # Frontend goes to root, not subdirectory
$BACKEND_DEST = "$DEST_DIR\backend"

# Color output functions
function Write-Success($message) {
    Write-Host $message -ForegroundColor Green
}

function Write-Info($message) {
    Write-Host $message -ForegroundColor Cyan
}

function Write-Warning($message) {
    Write-Host $message -ForegroundColor Yellow
}

function Write-Error($message) {
    Write-Host $message -ForegroundColor Red
}

function Write-Progress($message) {
    Write-Host $message -ForegroundColor Magenta
}

# Ensure destination directory exists
function Ensure-Directory($path) {
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Info "Created directory: $path"
    }
}

# Clean destination directory
function Clean-Directory($path) {
    if (Test-Path $path) {
        Write-Warning "Cleaning directory: $path"
        Remove-Item -Path "$path\*" -Recurse -Force
        Write-Success "Directory cleaned"
    }
}

# Copy files with exclusions
function Copy-WithExclusions($source, $destination, $excludePatterns) {
    Write-Progress "Copying from $source to $destination"
    
    # Ensure destination exists
    Ensure-Directory $destination
    
    # Get all items from source
    $items = Get-ChildItem -Path $source -Recurse
    
    foreach ($item in $items) {
        $relativePath = $item.FullName.Substring($source.Length + 1)
        $destPath = Join-Path $destination $relativePath
        
        # Check if item should be excluded
        $shouldExclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($relativePath -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        
        if (-not $shouldExclude) {
            if ($item.PSIsContainer) {
                # Create directory
                Ensure-Directory $destPath
            } else {
                # Copy file
                $destDir = Split-Path $destPath -Parent
                Ensure-Directory $destDir
                Copy-Item $item.FullName $destPath -Force
                if ($Verbose) {
                    Write-Host "  Copied: $relativePath" -ForegroundColor Gray
                }
            }
        } else {
            if ($Verbose) {
                Write-Host "  Excluded: $relativePath" -ForegroundColor DarkGray
            }
        }
    }
}

# Build frontend
function Build-Frontend {
    Write-Progress "Building frontend..."
    Set-Location $FRONTEND_SRC
    
    # Install dependencies if node_modules doesn't exist
    if (!(Test-Path "node_modules")) {
        Write-Info "Installing frontend dependencies..."
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to install frontend dependencies"
            return $false
        }
    }
    
    # Set up environment configuration
    $environment = if ($Production) { "production" } else { "preview" }
    Write-Info "Setting up $environment environment for frontend build..."
    $envSrc = ".env.$environment"
    $envTemp = ".env.local"
    
    if (Test-Path $envSrc) {
        # Copy environment file to .env.local to ensure it's used during build
        Copy-Item $envSrc $envTemp -Force
        Write-Info "Using $envSrc for frontend build"
    } else {
        Write-Warning "$envSrc not found - using default environment"
    }
    
    # Build the frontend
    Write-Info "Building frontend for production..."
    $env:NODE_ENV = "production"
    
    # Set base path based on environment
    if ($Production) {
        # Production uses root path
        $env:VITE_BASE_PATH = "/"
        npx vite build --mode production
    } else {
        Write-Info "Setting base path for preview environment..."
        $env:VITE_BASE_PATH = "/$PROJECT_NAME/"
        # Build with preview mode to use .env.preview
        npx vite build --mode preview
    }
    
    $buildResult = $LASTEXITCODE
    
    # Clean up temporary env file
    if (Test-Path $envTemp) {
        Remove-Item $envTemp -Force
    }
    
    if ($buildResult -ne 0) {
        Write-Error "Failed to build frontend"
        return $false
    }
    
    Write-Success "Frontend build completed"
    return $true
}

# Publish frontend
function Publish-Frontend {
    Write-Progress "Publishing frontend..."
    
    # Build first
    if (!(Build-Frontend)) {
        return $false
    }
    
    # Clean destination if requested (but preserve backend directory)
    if ($Clean) {
        Write-Warning "Cleaning frontend files from root directory (preserving backend)..."
        # Clean only frontend files, not the backend directory
        Get-ChildItem -Path $FRONTEND_DEST -Exclude "backend" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Write-Success "Frontend files cleaned"
    }
    
    # Copy built files (dist folder) to root
    $distPath = "$FRONTEND_SRC\dist"
    if (Test-Path $distPath) {
        Write-Info "Copying built frontend files to root directory..."
        
        # Get all items from the dist folder
        Get-ChildItem -Path $distPath | ForEach-Object {
            $sourceItem = $_.FullName
            $itemName = $_.Name
            $destPath = Join-Path $FRONTEND_DEST $itemName
            
            # Don't overwrite backend directory
            if ($itemName -ne "backend") {
                # If destination exists and it's a directory, remove it first to prevent nesting
                if ((Test-Path $destPath) -and (Get-Item $destPath).PSIsContainer) {
                    Write-Verbose "Removing existing directory: $destPath"
                    Remove-Item $destPath -Recurse -Force -ErrorAction SilentlyContinue
                }
                
                # Copy the item
                if ($_.PSIsContainer) {
                    # For directories, copy contents
                    Copy-Item $sourceItem $destPath -Recurse -Force
                } else {
                    # For files, copy directly
                    Copy-Item $sourceItem $destPath -Force
                }
                
                if ($Verbose) {
                    Write-Host "  Copied: $itemName" -ForegroundColor Gray
                }
            }
        }
        Write-Success "Frontend published to $FRONTEND_DEST (root)"
        return $true
    } else {
        Write-Error "Frontend build output not found at $distPath"
        return $false
    }
}

# Install PHP backend dependencies
function Install-BackendDependencies {
    Write-Progress "Installing PHP backend dependencies..."
    Set-Location $BACKEND_SRC
    
    # Check if composer is available
    try {
        composer --version | Out-Null
    } catch {
        Write-Error "Composer not found. Please install Composer first."
        return $false
    }
    
    # Install dependencies
    composer install --no-dev --optimize-autoloader
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install PHP dependencies"
        return $false
    }
    
    Write-Success "PHP dependencies installed"
    return $true
}

# Publish PHP backend
function Publish-Backend {
    Write-Progress "Publishing PHP backend..."
    
    # Install dependencies
    if (!(Install-BackendDependencies)) {
        return $false
    }
    
    # Clean destination if requested
    if ($Clean) {
        Clean-Directory $BACKEND_DEST
    }
    
    # Define exclusion patterns for backend
    $excludePatterns = @(
        "node_modules\*",
        ".git\*",
        ".env",
        ".env.local",
        ".env.example",
        "tests\*",
        "*.log",
        "*.tmp",
        "storage\logs\*",
        "storage\cache\*",
        "var\cache\*",
        "vendor\*\tests\*",
        "vendor\*\test\*",
        "vendor\*\.git\*",
        "*.md",
        "composer.lock",
        "phpunit.xml",
        "init-db.ps1",
        "debug_bet.php",
        "debug_bet_api.php",
        "test-di.php",
        "install.php",
        "NODE_TO_PHP_MIGRATION_GUIDE.md",
        "DI_IMPLEMENTATION.md",
        "improvement.md",
        "codereview.md"
    )
    
    # Copy backend files with exclusions
    Copy-WithExclusions $BACKEND_SRC $BACKEND_DEST $excludePatterns
    
    # Handle environment configuration file
    $environment = if ($Production) { "production" } else { "preview" }
    Write-Info "Setting up $environment environment configuration..."
    $envSrc = "$BACKEND_SRC\.env.$environment"
    $envDest = "$BACKEND_DEST\.env"
    
    if (Test-Path $envSrc) {
        Copy-Item $envSrc $envDest -Force
        Write-Success "Copied $envSrc to .env for $environment use"
    } else {
        Write-Warning "$envSrc not found in source - copying base .env file"
        $baseEnvSrc = "$BACKEND_SRC\.env"
        if (Test-Path $baseEnvSrc) {
            Copy-Item $baseEnvSrc $envDest -Force
            Write-Info "Copied base .env file to $environment deployment"
        } else {
            Write-Error "No .env file found in source directory!"
            return $false
        }
    }
    
    # Create necessary directories and files for production
    $storageDir = "$BACKEND_DEST\storage"
    $varDir = "$BACKEND_DEST\var"
    Ensure-Directory "$storageDir\logs"
    Ensure-Directory "$varDir\cache"
    
    # Set proper permissions for storage directories (Windows equivalent)
    Write-Info "Setting up storage permissions..."
    
    # Copy essential production files
    Write-Info "Setting up production configuration..."
    
    # Copy .htaccess if it doesn't exist
    $htaccessSrc = "$BACKEND_SRC\public\.htaccess"
    $htaccessDest = "$BACKEND_DEST\public\.htaccess"
    if ((Test-Path $htaccessSrc) -and !(Test-Path $htaccessDest)) {
        Copy-Item $htaccessSrc $htaccessDest
        Write-Info "Copied .htaccess file"
    }
    
    Write-Success "PHP backend published to $BACKEND_DEST"
    return $true
}

# Main execution
function Main {
    Write-Info "$PROJECT_NAME Publishing Script"
    Write-Info "=========================="
    
    # Ensure WebHatchery directory exists
    Ensure-Directory $DEST_DIR
    
    $success = $true
    
    # Determine what to publish
    if ($All -or (!$Frontend -and !$Backend)) {
        Write-Info "Publishing both frontend and backend..."
        $Frontend = $true
        $Backend = $true
    }
    
    # Store original location
    $originalLocation = Get-Location
    
    try {
        # Publish frontend
        if ($Frontend) {
            if (!(Publish-Frontend)) {
                $success = $false
            }
        }
        
        # Publish backend
        if ($Backend) {
            if (!(Publish-Backend)) {
                $success = $false
            }
        }
        
        if ($success) {
            # Copy root .htaccess file for URL rewriting
            $rootHtaccessSrc = "$SOURCE_DIR\.htaccess"
            $rootHtaccessDest = "$DEST_DIR\.htaccess"
            if (Test-Path $rootHtaccessSrc) {
                Copy-Item $rootHtaccessSrc $rootHtaccessDest -Force
                Write-Info "Copied root .htaccess file for URL rewriting"
            }
            
            Write-Success "`n✅ Publishing completed successfully!"
            Write-Info "Files published to: $DEST_DIR"
            Write-Info "Ready for server sync."
        } else {
            Write-Error "`n❌ Publishing failed!"
            exit 1
        }
        
    } finally {
        # Return to original location
        Set-Location $originalLocation
    }
}

# Show help
function Show-Help {
    Write-Host @"
$PROJECT_NAME Publishing Script
==========================

Usage: .\publish.ps1 [OPTIONS]

OPTIONS:
    -Frontend, -f    Publish only the frontend
    -Backend, -b     Publish only the PHP backend  
    -All, -a         Publish both (default if no specific option given)
    -Clean, -c       Clean destination directories before publishing
    -Verbose, -v     Show detailed output during copying
    -Production, -p  Deploy to production environment (F:\WebHatchery)
                     Default: Deploy to preview environment (H:\xampp\htdocs)
    -Help            Show this help message

EXAMPLES:
    .\publish.ps1                                       # Publish both to preview (H:\xampp\htdocs)
    .\publish.ps1 -f                                   # Publish only frontend to preview
    .\publish.ps1 -b                                   # Publish only backend to preview
    .\publish.ps1 -f -p                               # Publish frontend to production
    .\publish.ps1 -a -c -p                            # Clean and publish both to production
    .\publish.ps1 -Frontend -Verbose -Production       # Publish frontend to production with details

DESCRIPTION:
    This script builds and publishes the $PROJECT_NAME web game to either the 
    preview environment (H:\xampp\htdocs) or production environment (F:\WebHatchery).
    The frontend is built using npm and deployed to the root directory, while
    the PHP backend is deployed to the backend/ subdirectory with dependencies
    optimized for the target environment.
    
    Deployment Structure (for both environments):
    <root>\$PROJECT_NAME\
    ├── index.html          # Frontend files (root)
    ├── assets\             # Frontend assets
    └── backend\            # PHP backend
        ├── public\
        ├── src\
        ├── vendor\
        ├── storage\
        └── var\

"@ -ForegroundColor White
}

# Check for help request
if ($args -contains "-Help" -or $args -contains "--help" -or $args -contains "/?" -or $args -contains "-h") {
    Show-Help
    exit 0
}

# Run main function
Main
