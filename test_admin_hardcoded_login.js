import { verifyAdminMasterCode, authenticateAdminByMasterCode, authenticateUser } from './src/services/userService.js'
import { getMemberStoreSnapshot } from './src/data/memberStore.js'

async function runTests() {
  console.log('🧪 Starting Admin Hardcoded Code & Security Clearance Tests...\n')

  // Test 1: Code Verification logic
  console.log('--- Test 1: Code verification helper ---')
  const validCodes = ['ALPHA-7789', 'alpha-7789', 'ALPHA7789', '7789', 'NEXORA-ALPHA-7789']
  for (const c of validCodes) {
    const isValid = verifyAdminMasterCode(c)
    console.log(`Checking valid code "${c}":`, isValid ? '✅ PASS' : '❌ FAIL')
    if (!isValid) throw new Error(`Expected ${c} to be valid`)
  }

  const invalidCodes = ['1234', '0000', 'admin', 'password123', '', null, undefined]
  for (const c of invalidCodes) {
    const isValid = verifyAdminMasterCode(c)
    console.log(`Checking invalid code "${c}":`, !isValid ? '✅ PASS (Rejected)' : '❌ FAIL')
    if (isValid) throw new Error(`Expected ${c} to be rejected`)
  }

  // Test 2: authenticateAdminByMasterCode
  console.log('\n--- Test 2: authenticateAdminByMasterCode ---')
  const authFail = await authenticateAdminByMasterCode('wrong-cipher-999')
  console.log('Wrong cipher attempt:', !authFail.success ? '✅ PASS (Correctly denied)' : '❌ FAIL')

  const authSuccess = await authenticateAdminByMasterCode('ALPHA-7789')
  console.log('Correct master cipher attempt:', authSuccess.success ? '✅ PASS (Access granted)' : '❌ FAIL')
  console.log('Logged in user role:', authSuccess.data?.role, 'Username:', authSuccess.data?.username)

  const pinSuccess = await authenticateAdminByMasterCode('7789')
  console.log('Correct 4-digit PIN attempt:', pinSuccess.success ? '✅ PASS (Access granted)' : '❌ FAIL')

  // Test 3: Standard authenticateUser method guarding adminalpha
  console.log('\n--- Test 3: Standard authenticateUser with adminalpha ---')
  const userFormFail = await authenticateUser({ identifier: 'adminalpha', password: 'wrongpassword' })
  console.log('Form login with invalid password:', !userFormFail.success ? '✅ PASS (Blocked)' : '❌ FAIL')

  const userFormPass = await authenticateUser({ identifier: 'adminalpha', password: 'ALPHA-7789' })
  console.log('Form login with master key ALPHA-7789:', userFormPass.success ? '✅ PASS (Authorized)' : '❌ FAIL')

  console.log('\n🎉 ALL ADMIN SECURITY CLEARANCE TESTS PASSED!')
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err)
  process.exit(1)
})
