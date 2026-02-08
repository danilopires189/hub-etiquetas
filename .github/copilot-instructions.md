# GitHub Copilot Instructions for Hub de Etiquetas

## Overview
This project is an integrated label generation system for internal use at Pague Menos. Understanding the architecture and workflows is crucial for effective contributions.

## Architecture
- **Major Components**: The project consists of multiple modules such as `etiqueta-mercadoria`, `avulso`, `transferencia`, and others, each responsible for specific functionalities related to label generation.
- **Service Boundaries**: Each module operates independently but communicates through shared data structures and APIs, ensuring a clear separation of concerns.
- **Data Flows**: Data is primarily managed through JSON files and PHP scripts, with critical interactions occurring in the `api/` directory.

## Developer Workflows
- **Building**: Use the provided `deploy-corrections.bat` for Windows or `deploy-corrections.sh` for Linux/Mac to deploy changes. Ensure all new files are included in the deployment process.
- **Testing**: Follow the naming conventions and structure outlined in the `README.md` and `COMANDOS-DEPLOY.md` for testing new features and fixes.
- **Debugging**: Utilize the `shared/` directory for common debugging tools and scripts that can be reused across modules.

## Project-Specific Conventions
- **Naming Conventions**: Follow the established naming patterns for files and functions to maintain consistency across the codebase. Refer to the `implementation-summary.md` for examples of completed implementations.
- **Documentation**: Keep documentation up to date in the `.docs/` directory, especially after significant changes or additions to the codebase.

## Integration Points
- **External Dependencies**: The project relies on Supabase for database management and authentication. Ensure you are familiar with the integration points outlined in the `supabase/` directory.
- **Cross-Component Communication**: Use the shared components in the `shared/` directory to facilitate communication between modules, ensuring that all modules can access common functionalities without duplication.

## Examples
- For implementing a new feature in the `etiqueta-mercadoria` module, refer to the `fix-print-flow.js` for patterns on how to structure your code and handle data.
- When modifying existing functionality, check the `COMANDOS-DEPLOY.md` for any specific commands that need to be executed post-modification.

## Conclusion
By following these guidelines, AI agents can effectively navigate and contribute to the Hub de Etiquetas project, ensuring a smooth development process and high-quality outputs.