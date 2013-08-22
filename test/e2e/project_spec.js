describe("E2E: Testing Controllers", function() {

  beforeEach(function() {
    browser().navigateTo('/');
  });

  it('should have a working videos page controller that applies the videos to the scope', function() {
    expect(browser().location().path()).toBe("/videos");
  });
});