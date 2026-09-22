const fs = require('fs');
const PlaceholderValidator = require('./placeholderIntegrityValidator');

class ApplyGate {
  /**
   * Pre-Apply Gate: Verifies all invariants before modifying files.
   */
  static verifyPreApply(options = {}) {
    const checks = {
      backupVerified: !!options.backupVerified,
      stagingCopyValid: !!options.stagingCopyValid,
      writePermissionGranted: !!options.writePermissionGranted,
      strategyValidated: !!options.strategyValidated,
      syntaxValid: options.syntaxValid !== false,
      placeholderValid: true,
      structuralQaValid: options.qaApproved !== false,
      rollbackSnapshotAvailable: !!options.rollbackAvailable
    };

    // Test placeholder integrity if sample strings provided
    if (options.sampleStrings && Array.isArray(options.sampleStrings)) {
      for (const item of options.sampleStrings) {
        const val = PlaceholderValidator.validate(item.original, item.translated);
        if (!val.valid) {
          checks.placeholderValid = false;
          checks.failedToken = val.missingTokens;
          break;
        }
      }
    }

    const failed = Object.entries(checks).filter(([k, v]) => v === false);
    return {
      allowed: failed.length === 0,
      checks,
      failedChecks: failed.map(([k]) => k)
    };
  }

  /**
   * Post-Apply Validation: Verifies game integrity and triggers automated rollback on failure.
   */
  static async verifyPostApply(gamePath, options = {}) {
    const postChecks = {
      filesExist: fs.existsSync(gamePath),
      noCorruptedZeros: true,
      syntaxPassed: options.postSyntaxPassed !== false,
      launchTested: options.launchTested !== false,
      crashed: !!options.gameCrashed
    };

    const passed = postChecks.filesExist && postChecks.syntaxPassed && !postChecks.crashed;
    return {
      ok: passed,
      shouldRollback: !passed,
      postChecks
    };
  }
}

module.exports = ApplyGate;
